import path from "path"

export const defaultMapFilePathToHTTPRoute =
  (api_prefix: string = "/api") =>
  (file_path: string) => {
    const route = file_path
      // replace ./ if it starts with ./
      .replace(/^\.\//, "/")
      // replace starting /
      .replace(/^\//, "")
      // replace /src if it starts with /src
      .replace(/^src\//, "")
      // replace /pages if it starts with /pages
      .replace(/^pages\//, "")
      // replace /api if it starts with /api
      .replace(/^api\//, "")
    return path.join(
      api_prefix,
      route.replace(/\.ts$/, "").replace("public", "")
    )
  }
