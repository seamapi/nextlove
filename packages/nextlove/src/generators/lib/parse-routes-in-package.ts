import path from "node:path"
import { RouteSpec, SetupParams } from "../../types"
import { defaultMapFilePathToHTTPRoute } from "./default-map-file-path-to-http-route"

export interface RouteInfo {
  setupParams: SetupParams
  routeSpec: RouteSpec
  routeFn: Function
  route: string
}

export const parseRoutesInPackage = async (opts: {
  packageDir: string
  pathGlob?: string
  apiPrefix?: string
  mapFilePathToHTTPRoute?: (file_path: string) => string
}): Promise<Map<string, RouteInfo>> => {
  const chalk = (await import("chalk")).default
  const globby = (await import("globby")).globby
  const {
    packageDir,
    pathGlob = "/pages/api/**/*.ts",
    mapFilePathToHTTPRoute = defaultMapFilePathToHTTPRoute(opts.apiPrefix),
  } = opts
  // Load all route specs
  const fullPathGlob = path.posix.join(packageDir, pathGlob)
  console.log(`searching "${fullPathGlob}"...`)
  const filepaths = await globby(`${fullPathGlob}`)
  console.log(`found ${filepaths.length} files`)
  if (filepaths.length === 0) {
    throw new Error(`No files found at "${fullPathGlob}"`)
  }
  const filepathToRouteFn = new Map<string, RouteInfo>()

  await Promise.all(
    filepaths.map(async (p) => {
      const { default: routeFn } = await require(path.resolve(p))

      if (routeFn) {
        if (routeFn._routeSpec?.excludeFromOpenApi) {
          return
        }
      }

      if (routeFn) {
        if (!routeFn._setupParams) {
          console.warn(
            chalk.yellow(
              `Ignoring "${p}" because it wasn't created with withRouteSpec`
            )
          )
          return
        }
        filepathToRouteFn.set(p, {
          setupParams: routeFn._setupParams,
          routeSpec: routeFn._routeSpec,
          route: mapFilePathToHTTPRoute(p),
          routeFn,
        })
      } else {
        console.warn(chalk.yellow(`Couldn't find route ${p}`))
      }
    })
  )

  return filepathToRouteFn
}
