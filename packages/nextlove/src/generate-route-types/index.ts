import * as fs from "node:fs/promises"
import { defaultMapFilePathToHTTPRoute } from "../lib/default-map-file-path-to-http-route"
import { parseRoutesInPackage } from "../lib/parse-routes-in-package"
import { zodToTs, printNode } from "zod-to-ts"
import prettier from "prettier"
import { z } from "zod"

interface GenerateRouteTypesOpts {
  packageDir: string
  outputFile?: string
  pathGlob?: string
  apiPrefix?: string
  mapFilePathToHTTPRoute?: (file_path: string) => string
}

export const generateRouteTypes = async (opts: GenerateRouteTypesOpts) => {
  const filepathToRoute = await parseRoutesInPackage(opts)

  // TODO when less lazy, use ts-morph for better generation
  const routeDefs: string[] = []
  for (const [_, { route, routeSpec, setupParams }] of filepathToRoute) {
    routeDefs.push(
      `
"${route}": {
  route: "${route}",
  method: ${routeSpec.methods.map((m) => `"${m}"`).join(" | ")},
  queryParams: ${
    routeSpec.queryParams
      ? printNode(zodToTs(routeSpec.queryParams).node)
      : "{}"
  },
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
            setupParams.addOkStatus
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
  const output = prettier.format(
    `export interface Routes {
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
