import * as fs from "node:fs/promises"
import { parseRoutesInPackage } from "../lib/parse-routes-in-package"
import { zodToTs, printNode } from "zod-to-ts"
import prettier from "prettier"
import { z, ZodEffects, ZodOptional } from "zod"

interface GenerateRouteTypesOpts {
  packageDir: string
  outputFile?: string
  pathGlob?: string
  apiPrefix?: string
  mapFilePathToHTTPRoute?: (file_path: string) => string
  /**
   * If provided, only routes that return true will be included in the generated types.
   */
  filterRoutes?: (route: string) => boolean
  /**
   * By default, routes that have `excludeFromOpenApi` set to true will be excluded from the generated types.
   * Set this to true to include them.
   */
  includeOpenApiExcludedRoutes?: boolean
}

export const generateRouteTypes = async (opts: GenerateRouteTypesOpts) => {
  const filepathToRoute = await parseRoutesInPackage(opts)

  const sortedRoutes = Array.from(filepathToRoute.entries()).sort((a, b) =>
    a[1].route.localeCompare(b[1].route)
  )
  const filteredRoutes = sortedRoutes.filter(
    ([_, { route }]) => !opts.filterRoutes || opts.filterRoutes(route)
  )

  // TODO when less lazy, use ts-morph for better generation
  const routeDefs: string[] = []
  for (const [_, { route, routeSpec, setupParams }] of filteredRoutes) {
    const queryKeys = Object.keys(routeSpec.queryParams?.shape ?? {})
    const pathParameters = queryKeys.filter((key) => route.includes(`[${key}]`))

    // queryParams might be a ZodEffects or ZodOptional in some cases
    let queryParams = routeSpec.queryParams
    while (
      queryParams &&
      ("sourceType" in queryParams || "unwrap" in queryParams)
    ) {
      if ("sourceType" in queryParams) {
        queryParams = (queryParams as unknown as ZodEffects<any>).sourceType()
      } else if ("unwrap" in queryParams) {
        queryParams = (queryParams as unknown as ZodOptional<any>).unwrap()
      }
    }

    if (queryParams && "omit" in queryParams) {
      queryParams = queryParams.omit(
        Object.fromEntries(pathParameters.map((param) => [param, true]))
      )
    }

    routeDefs.push(
      `
"${route}": {
  route: "${route}",
  method: ${routeSpec.methods.map((m) => `"${m}"`).join(" | ")},
  queryParams: ${queryParams ? printNode(zodToTs(queryParams).node) : "{}"},
  jsonBody: ${
    routeSpec.jsonBody ? printNode(zodToTs(routeSpec.jsonBody).node) : "{}"
  },
  commonParams: ${
    routeSpec.commonParams
      ? printNode(zodToTs(routeSpec.commonParams).node)
      : "{}"
  },
  formData: ${
    routeSpec.formData ? printNode(zodToTs(routeSpec.formData).node) : "{}"
  },
  jsonResponse: ${
    routeSpec.jsonResponse
      ? printNode(
          zodToTs(
            setupParams.addOkStatus &&
              routeSpec.jsonResponse instanceof z.ZodObject
              ? routeSpec.jsonResponse.extend({ ok: z.boolean() })
              : routeSpec.jsonResponse
          ).node
        )
      : "{}"
  }
}`.trim()
    )
  }
  const routeDefStr = routeDefs.join(",\n")
  const output = await prettier.format(
    `export type Routes = {
${routeDefStr}
}

export type RouteResponse<Path extends keyof Routes> =
  Routes[Path]["jsonResponse"]

export type RouteRequestBody<Path extends keyof Routes> =
  Routes[Path]["jsonBody"] & Routes[Path]["commonParams"]

export type RouteRequestParams<Path extends keyof Routes> =
  Routes[Path]["queryParams"] & Routes[Path]["commonParams"]
`.trim(),
    { semi: false, parser: "typescript" }
  )

  if (opts.outputFile) {
    await fs.writeFile(opts.outputFile, output)
  }

  return output
}
