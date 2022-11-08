import { defaultMapFilePathToHTTPRoute } from "../lib/default-map-file-path-to-http-route"
import { parseRoutesInPackage } from "../lib/parse-routes-in-package"

interface GenerateRouteTypesOpts {
  packageDir: string
  outputFile?: string
  pathGlob?: string
  apiPrefix?: string
  mapFilePathToHTTPRoute?: (file_path: string) => string
}

export const generateRouteTypes = async (opts: GenerateRouteTypesOpts) => {
  const filepathToRoute = await parseRoutesInPackage(opts)
}
