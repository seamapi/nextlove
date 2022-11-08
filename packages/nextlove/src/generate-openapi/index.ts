import fs from "node:fs/promises"
import path from "node:path"
import globby from "globby"
import { generateSchema } from "@anatine/zod-openapi"
import {
  OpenApiBuilder,
  OperationObject,
  ParameterObject,
  SecurityRequirementObject,
} from "openapi3-ts"
import { RouteSpec, SetupParams } from "../types"
import { Entries } from "type-fest"
import chalk from "chalk"
import { defaultMapFilePathToHTTPRoute } from "../lib/default-map-file-path-to-http-route"
import { parseRoutesInPackage } from "../lib/parse-routes-in-package"

interface GenerateOpenAPIOpts {
  packageDir: string
  outputFile?: string
  pathGlob?: string
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
  const { outputFile } = opts

  const filepathToRouteFn = await parseRoutesInPackage(opts)

  // TODO detect if there are multiple setups and output different APIs
  const { setupParams: globalSetupParams } = filepathToRouteFn.values().next()
    .value as { setupParams: SetupParams }

  const securitySchemes = {}
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
    paths: {},
    components: {
      securitySchemes,
    },
  })

  for (const [
    file_path,
    { setupParams, routeSpec, route: routePath },
  ] of filepathToRouteFn) {
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

    if (routeSpec.jsonBody || routeSpec.commonParams) {
      route.requestBody = {
        content: {
          "application/json": {
            schema: generateSchema(
              (routeSpec.jsonBody as any) || routeSpec.commonParams
            ),
          },
        },
      }
    }

    if (routeSpec.queryParams) {
      const schema = generateSchema(routeSpec.queryParams)

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

    if (routeSpec.jsonResponse) {
      route.responses[200].content = {
        "application/json": {
          schema: generateSchema(routeSpec.jsonResponse),
        },
      }
    }

    // Some routes accept multiple methods
    builder.addPath(routePath, {
      ...routeSpec.methods
        .map((method) => ({
          [method.toLowerCase()]: route,
        }))
        .reduceRight((acc, cur) => ({ ...acc, ...cur }), {}),
    })
  }

  if (outputFile) {
    await fs.writeFile(outputFile, builder.getSpecAsJson())
  }

  return builder.getSpecAsJson()
}
