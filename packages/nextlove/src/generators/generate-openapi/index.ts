import fs from "node:fs/promises"
import { generateSchema } from "@anatine/zod-openapi"
import {
  OpenApiBuilder,
  OperationObject,
  ParameterObject,
} from "openapi3-ts/oas31"
import { SetupParams } from "../../types"
import chalk from "chalk"
import { z } from "zod"
import { parseRoutesInPackage } from "../lib/parse-routes-in-package"
import { embedSchemaReferences } from "./embed-schema-references"

function transformPathToOperationId(path: string): string {
  function replaceFirstCharToLowercase(str: string) {
    if (str.length === 0) {
      return str
    }

    const firstChar = str.charAt(0).toLowerCase()
    return firstChar + str.slice(1)
  }

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
}

/**
 * This function generates an OpenAPI spec from the Next.js API routes.
 *
 * You normally invoke this with `nextapi generate-openapi` in a
 * "build:openapi" package.json script.
 */
export async function generateOpenAPI(opts: GenerateOpenAPIOpts) {
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

  // Build OpenAPI spec
  const builder = OpenApiBuilder.create({
    openapi: "3.0.0",
    info: {
      title: globalSetupParams.apiName,
      version: "1.0.0",
    },
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
    const isPostOrPutOrPatch = ["POST", "PUT", "PATCH"].some((method) =>
      routeSpec.methods.includes(method)
    )
    // TODO: support multipart/form-data

    // handle body
    let body_to_generate_schema
    if (isPostOrPutOrPatch) {
      body_to_generate_schema = routeSpec.jsonBody ?? routeSpec.commonParams

      if (routeSpec.jsonBody && routeSpec.commonParams) {
        body_to_generate_schema = routeSpec.jsonBody.merge(
          routeSpec.commonParams
        )
      }
    } else {
      body_to_generate_schema = routeSpec.jsonBody
    }

    // handle query
    let query_to_generate_schema
    if (isPostOrPutOrPatch) {
      query_to_generate_schema = routeSpec.jsonBody
    } else {
      query_to_generate_schema = routeSpec.queryParams ?? routeSpec.commonParams

      if (routeSpec.queryParams && routeSpec.commonParams) {
        query_to_generate_schema = routeSpec.queryParams.merge(
          routeSpec.commonParams
        )
      }
    }

    // DELETE and GET cannot have a body
    let methods = routeSpec.methods

    if (routeSpec.methods.includes("DELETE") && body_to_generate_schema) {
      methods = methods.filter((m) => m !== "DELETE")
    }

    if (routeSpec.methods.includes("GET") && body_to_generate_schema) {
      methods = methods.filter((m) => m !== "GET")
    }

    if (methods.length === 0) {
      console.warn(
        chalk.yellow(`Skipping route ${routePath} because it has no methods.`)
      )
      continue
    }

    const route: OperationObject = {
      summary: routePath,
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
      security: securityObjectsForAuthType[routeSpec.auth],
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
      }
    }

    const { jsonResponse } = routeSpec
    const { addOkStatus = true } = setupParams

    if (jsonResponse) {
      if (
        !jsonResponse._def ||
        !jsonResponse._def.typeName ||
        jsonResponse._def.typeName !== "ZodObject"
      ) {
        console.warn(
          chalk.yellow(
            `Skipping route ${routePath} because the response is not a ZodObject.`
          )
        )
        continue
      }

      const responseSchema = generateSchema(
        addOkStatus ? jsonResponse.extend({ ok: z.boolean() }) : jsonResponse
      )

      const schemaWithReferences = embedSchemaReferences(
        responseSchema,
        globalSchemas
      )

      route.responses[200].content = {
        "application/json": {
          schema: schemaWithReferences,
        },
      }
    }

    route.tags = []
    for (const tag of tags) {
      if (tag.doesRouteHaveTag && tag.doesRouteHaveTag(route.summary || "")) {
        route.tags.push(tag.name)
      }
    }

    // Some routes accept multiple methods
    builder.addPath(routePath, {
      ...methods
        .map((method) => ({
          [method.toLowerCase()]: {
            ...route,
            operationId: `${transformPathToOperationId(routePath)}${pascalCase(
              method
            )}`,
          },
        }))
        .reduceRight((acc, cur) => ({ ...acc, ...cur }), {}),
    })
  }

  if (outputFile) {
    await fs.writeFile(outputFile, builder.getSpecAsJson())
  }

  return builder.getSpecAsJson()
}
