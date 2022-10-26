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
import { RouteSpec } from "../types"

export const defaultMapFilePathToHTTPRoute = (file_path: string) => {
  const route = file_path.replace(/^\.\/pages\/api\//, "")
  return route.replace(/\.ts$/, "").replace("public", "")
}

const getSecurityObject = (
  auth_type: RouteSpec["auth"]
): SecurityRequirementObject[] => {
  switch (auth_type) {
    case "key_or_session":
      return [
        {
          apiKeyAuth: [],
        },
        {
          sessionAuth: [],
        },
      ]
    case "key":
      return [
        {
          apiKeyAuth: [],
        },
      ]
    case "session":
      return [
        {
          sessionAuth: [],
        },
      ]
    case "none":
      return []
    default:
      throw new Error(`Unknown auth type: ${auth_type}`)
  }
}

interface GenerateOpenAPIOpts {
  packageDir: string
  apiName: string
  productionServerUrl: string
  pathGlob?: string
  mapFilePathToHTTPRoute?: (file_path: string) => string
}

/**
 * This function generates an OpenAPI spec from the Next.js API routes.
 *
 * You normally invoke this with `nextjs-api generate-openapi` in a
 * "build:openapi" package.json script.
 */
export async function generateOpenAPI(opts: GenerateOpenAPIOpts) {
  const {
    packageDir,
    pathGlob = "/pages/api/**/*.ts",
    mapFilePathToHTTPRoute = defaultMapFilePathToHTTPRoute,
  } = opts

  // Load all route specs
  console.log(`searching "${packageDir}${pathGlob}"...`)
  const filepaths = await globby(`${packageDir}${pathGlob}`)
  console.log(`found ${filepaths.length} files`)
  const filepathToRouteFn = new Map<string, RouteSpec>()

  let at_least_one_route_missing_spec = false
  await Promise.all(
    filepaths.map(async (p) => {
      const { default: routeFn } = await require(path.resolve(p))

      if (routeFn) {
        filepathToRouteFn.set(p, routeFn)
      } else {
        console.error("Couldn't find route", p)
        at_least_one_route_missing_spec = true
      }
    })
  )

  console.log(filepathToRouteFn)
  return

  // Build OpenAPI spec
  const builder = OpenApiBuilder.create({
    openapi: "3.0.0",
    info: {
      title: opts.apiName,
      version: "1.0.0",
    },
    servers: [
      {
        url: opts.productionServerUrl,
      },
    ],
    paths: {},
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        apiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API token",
        },
      },
    },
  })

  for (const [file_path, spec] of Object.entries(filepathToRouteFn)) {
    const route: OperationObject = {
      summary: mapFilePathToHTTPRoute(file_path),
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
      security: getSecurityObject(spec.auth),
    }

    if (spec.jsonBody) {
      route.requestBody = {
        content: {
          "application/json": {
            schema: generateSchema(spec.jsonBody),
          },
        },
      }
    }

    if (spec.queryParams) {
      const schema = generateSchema(spec.queryParams)

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

    // Some routes accept multiple methods
    builder.addPath(mapFilePathToHTTPRoute(file_path), {
      ...spec.methods
        .map((method) => ({
          [method.toLowerCase()]: route,
        }))
        .reduceRight((acc, cur) => ({ ...acc, ...cur }), {}),
    })
  }

  // await fs.writeFile("./public/openapi.json", builder.getSpecAsJson())
}
