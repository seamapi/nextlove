import fs from "node:fs/promises"
import {
  ExternalDocumentationObject,
  OpenApiBuilder,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31"
import { SetupParams } from "../../types/index.js"
import { z } from "zod"
import { parseRoutesInPackage } from "../lib/parse-routes-in-package.js"
import { generateSchema } from "../lib/zod-openapi.js"
import { embedSchemaReferences } from "./embed-schema-references.js"
import { selectSemanticMethod } from "./select-semantic-method.js"

export { selectSemanticMethod } from "./select-semantic-method.js"
import { mapMethodsToFernSdkMetadata } from "./fern-sdk-utils.js"
import { parseFrontMatter, testFrontMatter } from "../lib/front-matter.js"
import dedent from "dedent"
import { prefixObjectKeysWithX } from "../utils/prefix-object-keys-with-x.js"
import { dashifyObjectKeys } from "../utils/dashify-object-keys.js"
import { getTypeName } from "../../lib/zod-compat.js"

function replaceFirstCharToLowercase(str: string) {
  if (str.length === 0) {
    return str
  }

  const firstChar = str.charAt(0).toLowerCase()
  return firstChar + str.slice(1)
}

function transformPathToOperationId(path: string): string {
  const parts = path
    .replace(/-/g, "_")
    .split("/")
    .filter((part) => part !== "")
  const transformedParts = parts.map((part) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      // Convert [param] to ByParam
      const serviceName = part.slice(1, -1)
      const words = serviceName.split("_")
      const capitalizedWords = words.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      return `By${capitalizedWords.join("")}`
    } else {
      // Convert api_path to ApiPath
      const words = part.split("_")
      const capitalizedWords = words.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      return capitalizedWords.join("")
    }
  })

  return replaceFirstCharToLowercase(transformedParts.join(""))
}

function pascalCase(input: string): string {
  const words = input.split(" ")
  const capitalizedWords = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )
  const pascalCaseString = capitalizedWords.join("")
  return pascalCaseString
}

/**
 * A union query schema (e.g. z.union commonParams) has no top-level
 * properties, only oneOf/anyOf branches, so it would otherwise produce no
 * query parameters at all. Flatten the branches' properties into one
 * parameter list. A parameter is only marked required when every branch
 * requires it — a parameter required by just one branch is conditionally
 * required at most.
 */
function createUnionQueryParameters(schema: SchemaObject): ParameterObject[] {
  const union_branches = (schema.oneOf ?? schema.anyOf ?? []).filter(
    (branch): branch is SchemaObject =>
      typeof branch === "object" &&
      branch !== null &&
      "properties" in branch &&
      branch.properties != null
  )
  if (union_branches.length === 0) {
    return []
  }

  const properties_by_name: Record<string, SchemaObject | ReferenceObject> = {}
  for (const branch of union_branches) {
    for (const [name, property_schema] of Object.entries(
      branch.properties ?? {}
    )) {
      properties_by_name[name] ??= property_schema
    }
  }

  return Object.keys(properties_by_name).map((name) => {
    const is_required_in_every_branch = union_branches.every((branch) =>
      (branch.required ?? []).includes(name)
    )
    return {
      name,
      in: "query",
      schema: properties_by_name[name],
      required: is_required_in_every_branch || undefined,
    }
  })
}

interface TagOption {
  name: string
  description: string
  doesRouteHaveTag?: (route: string) => boolean
}

interface GenerateOpenAPIOpts {
  packageDir: string
  outputFile?: string
  pathGlob?: string
  tags?: Array<TagOption>
  apiPrefix?: string
  mapFilePathToHTTPRoute?: (file_path: string) => string
  /**
   * Markdown for the spec's `info.description`. Dedented and trimmed, so a
   * template literal with indentation is fine. This is the first prose a
   * human, doc generator, or coding agent reads, so use it for API-wide
   * guidance such as preferred client libraries or how requests must be
   * serialized.
   */
  apiDescription?: string
  /**
   * The spec's root-level `externalDocs` object.
   */
  externalDocs?: ExternalDocumentationObject
  /**
   * Extra fields merged into the spec's `info` object. Keys should be
   * specification extensions (`x-` prefixed), e.g. links to official SDKs
   * for tooling to surface.
   */
  infoExtensions?: Record<`x-${string}`, unknown>
}

/**
 * This function generates an OpenAPI spec from the Next.js API routes.
 *
 * You normally invoke this with `nextapi generate-openapi` in a
 * "build:openapi" package.json script.
 */
export async function generateOpenAPI(opts: GenerateOpenAPIOpts) {
  const chalk = (await import("chalk")).default
  const { outputFile, tags = [] } = opts

  const filepathToRouteFn = await parseRoutesInPackage(opts)

  // TODO detect if there are multiple setups and output different APIs
  const { setupParams: globalSetupParams } = filepathToRouteFn.values().next()
    .value as { setupParams: SetupParams }

  const securitySchemes = globalSetupParams.securitySchemas ?? {}
  const securityObjectsForAuthType = {}
  for (const authName of Object.keys(globalSetupParams.authMiddlewareMap)) {
    const mw = globalSetupParams.authMiddlewareMap[authName]
    if (mw.securitySchema) {
      securitySchemes[authName] = (mw as any).securitySchema
    } else {
      console.warn(
        chalk.yellow(
          `Authentication middleware "${authName}" has no securitySchema. You can define this on the function (e.g. after the export do... \n\nmyMiddleware.securitySchema = {\n  type: "http"\n  scheme: "bearer"\n  bearerFormat: "JWT"\n // or API Token etc.\n}\n\nYou can also define "securityObjects" this way, if you want to make the endpoint support multiple modes of authentication.\n\n`
        )
      )
    }

    securityObjectsForAuthType[authName] = (mw as any).securityObjects || [
      {
        [authName]: [],
      },
    ]
  }

  const globalSchemas = {}
  for (const [schemaName, zodSchema] of Object.entries(
    globalSetupParams.globalSchemas ?? {}
  )) {
    globalSchemas[schemaName] = generateSchema(zodSchema)
  }

  for (const [key, value] of Object.entries(globalSchemas)) {
    if (key === "batch") {
      const schemaWithReferences = embedSchemaReferences(value, globalSchemas)
      globalSchemas[key] = schemaWithReferences
    }
  }

  // Build OpenAPI spec
  const builder = OpenApiBuilder.create({
    openapi: "3.0.0",
    info: {
      title: globalSetupParams.apiName,
      version: "1.0.0",
      ...(opts.apiDescription != null && {
        description: dedent(opts.apiDescription).trim(),
      }),
      ...opts.infoExtensions,
    },
    ...(opts.externalDocs != null && { externalDocs: opts.externalDocs }),
    servers: [
      {
        url: globalSetupParams.productionServerUrl || "https://example.com",
      },
    ],
    tags: tags.map((tag) => ({ name: tag.name, description: tag.description })),
    paths: {},
    components: {
      securitySchemes,
      schemas: globalSchemas,
    },
  })

  for (const [
    file_path,
    { setupParams, routeSpec, route: routePath },
  ] of filepathToRouteFn) {
    const methods = routeSpec.methods
    if (methods.length === 0) {
      console.warn(
        chalk.yellow(`Skipping route ${routePath} because it has no methods.`)
      )
      continue
    }

    const semanticMethod = selectSemanticMethod(
      routePath,
      methods,
      routeSpec.deprecatedMethods ?? []
    )
    if (semanticMethod == null) {
      console.warn(
        chalk.yellow(
          `Skipping route ${routePath} because all of its methods are deprecated.`
        )
      )
      continue
    }
    const methodsToGenerate = [semanticMethod]

    let description = routeSpec.description
    let descriptionMetadata: {
      response_key?: string
      [key: string]: any
    } = {}

    if (description) {
      const trimmedDescription = dedent(description).trim()

      if (testFrontMatter(trimmedDescription)) {
        const { attributes, body } = parseFrontMatter(trimmedDescription)
        descriptionMetadata = attributes
        description = body.trim()
      } else {
        description = trimmedDescription
      }
    }

    const formattedDescriptionMetadata = prefixObjectKeysWithX(
      dashifyObjectKeys(descriptionMetadata)
    )

    const methodRoutes: Record<string, OperationObject> = {}

    for (const method of methodsToGenerate) {
      const isPostOrPutOrPatch = ["POST", "PUT", "PATCH"].includes(method)

      // TODO: support multipart/form-data
      let body_to_generate_schema
      if (isPostOrPutOrPatch) {
        body_to_generate_schema = routeSpec.jsonBody ?? routeSpec.commonParams

        if (routeSpec.jsonBody && routeSpec.commonParams) {
          body_to_generate_schema = (
            routeSpec.jsonBody as z.ZodObject<any>
          ).merge(routeSpec.commonParams as z.ZodObject<any>)
        }
      } else {
        body_to_generate_schema = routeSpec.jsonBody
      }

      let query_to_generate_schema
      if (isPostOrPutOrPatch) {
        query_to_generate_schema = routeSpec.queryParams
      } else {
        query_to_generate_schema =
          routeSpec.queryParams ?? routeSpec.commonParams

        if (routeSpec.queryParams && routeSpec.commonParams) {
          query_to_generate_schema = (
            routeSpec.queryParams as z.ZodObject<any>
          ).merge(routeSpec.commonParams as z.ZodObject<any>)
        }
      }

      const route: OperationObject = {
        ...routeSpec.openApiMetadata,
        ...formattedDescriptionMetadata,
        summary: routePath,
        ...(description && { description }),
        operationId: `${transformPathToOperationId(routePath)}${pascalCase(
          method
        )}`,
        responses: {
          200: {
            description: "OK",
          },
          400: {
            description: "Bad Request",
          },
          401: {
            description: "Unauthorized",
          },
        },
        security: Array.isArray(routeSpec.auth)
          ? routeSpec.auth
              .map((authType) => securityObjectsForAuthType[authType])
              .flat()
          : securityObjectsForAuthType[routeSpec.auth],
      }

      if (body_to_generate_schema) {
        route.requestBody = {
          content: {
            "application/json": {
              schema: generateSchema(body_to_generate_schema as any),
            },
          },
        }
      }

      if (query_to_generate_schema) {
        const schema = generateSchema(query_to_generate_schema as any)
        if (schema.properties) {
          const parameters: ParameterObject[] = Object.keys(
            schema.properties as any
          ).map((name) => {
            return {
              name,
              in: "query",
              schema: schema.properties![name],
              required: schema.required?.includes(name),
            }
          })

          route.parameters = parameters
        } else {
          const union_parameters = createUnionQueryParameters(schema)
          if (union_parameters.length > 0) {
            route.parameters = union_parameters
          }
        }
      }

      const { jsonResponse } = routeSpec
      const { addOkStatus = true } = setupParams

      if (jsonResponse) {
        const jsonResponseTypeName = getTypeName(jsonResponse)
        if (jsonResponseTypeName !== "ZodObject") {
          console.warn(
            chalk.yellow(
              `Skipping route ${routePath} because the response is not a ZodObject.`
            )
          )
          continue
        }

        const responseSchema = generateSchema(
          addOkStatus && jsonResponse instanceof z.ZodObject
            ? jsonResponse.extend({ ok: z.boolean() })
            : jsonResponse
        )

        const schemaWithReferences = embedSchemaReferences(
          responseSchema,
          globalSchemas
        )

        if (route.responses != null) {
          // TODO: we should not hardcode 200 here
          route.responses[200].content = {
            "application/json": {
              schema: schemaWithReferences,
            },
          }
        }
      }

      route.tags = []
      for (const tag of tags) {
        if (tag.doesRouteHaveTag && tag.doesRouteHaveTag(route.summary || "")) {
          route.tags.push(tag.name)
        }
      }

      const methodsMappedToFernSdkMetadata = await mapMethodsToFernSdkMetadata({
        methods: [method], // Only pass this specific method
        path: routePath,
        sdkReturnValue:
          descriptionMetadata?.response_key ?? routeSpec.sdkReturnValue,
      })

      Object.assign(route, methodsMappedToFernSdkMetadata[method])
      methodRoutes[method.toLowerCase()] = route
    }

    builder.addPath(routePath, methodRoutes)
  }

  if (outputFile) {
    await fs.writeFile(outputFile, builder.getSpecAsJson(undefined, 2))
  }

  return builder.getSpecAsJson(undefined, 2)
}
