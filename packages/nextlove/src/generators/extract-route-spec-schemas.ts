import * as fs from "node:fs/promises"
import { defaultMapFilePathToHTTPRoute } from "./lib/default-map-file-path-to-http-route"
import path from "node:path"
import { Project, SyntaxKind } from "ts-morph"
import * as esbuild from "esbuild"
import crypto from "node:crypto"
import micromatch from "micromatch"

interface GenerateRouteTypesOpts {
  packageDir: string
  allowedImportPatterns?: string[]
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

export const extractRouteSpecs = async (opts: GenerateRouteTypesOpts) => {
  const { packageDir, pathGlob = "/pages/api/**/*.ts" } = opts
  const fullPathGlob = path.posix.join(packageDir, pathGlob)

  const tempDir = path.resolve(
    `./.nextlove/extract-route-specs-temp-${crypto
      .randomBytes(4)
      .toString("hex")}`
  )
  await fs.mkdir(tempDir, { recursive: true })

  const project = new Project()

  const paths: string[] = []
  for (const sourceFile of project.addSourceFilesAtPaths(fullPathGlob)) {
    const defaultExport = sourceFile.getExportAssignment(
      (d) => !d.isExportEquals()
    )
    if (!defaultExport) {
      continue
    }

    const curriedWithRouteSpecCall = defaultExport
      .getExpression()
      .asKind(SyntaxKind.CallExpression)
    if (!curriedWithRouteSpecCall) {
      continue
    }
    const withRouteSpecCall = curriedWithRouteSpecCall
      .getExpression()
      .asKind(SyntaxKind.CallExpression)
    if (!withRouteSpecCall) {
      continue
    }

    const [routeSpec] = withRouteSpecCall.getArguments()
    if (!routeSpec) {
      continue
    }

    sourceFile.addStatements(
      `export const extractedRouteSpec = ${routeSpec.getText()}`
    )

    defaultExport.remove()
    for (let i = 0; i++; i < 3) {
      sourceFile.fixUnusedIdentifiers()
    }

    const absolutePackageDir = path.resolve(packageDir)
    const relativePath = path.relative(
      absolutePackageDir,
      sourceFile.getFilePath()
    )
    await fs.mkdir(path.join(tempDir, path.dirname(relativePath)), {
      recursive: true,
    })
    await fs.writeFile(
      path.join(tempDir, relativePath),
      sourceFile.getFullText()
    )
    paths.push(relativePath)
  }

  const pathToId: Record<string, string> = {}
  for (const path of paths) {
    // add prefix to avoid starting with a number
    pathToId[path] =
      "hash" + crypto.createHash("sha256").update(path).digest("hex")
  }

  await fs.writeFile(
    path.join(tempDir, "index.ts"),
    `
  ${paths
    .map((p) => `import {extractedRouteSpec as ${pathToId[p]}} from "./${p}"`)
    .join("\n")}

  export const routeSpecs = {
    ${paths
      .map((p) => {
        const httpRoute = (
          opts.mapFilePathToHTTPRoute ??
          defaultMapFilePathToHTTPRoute(opts.apiPrefix)
        )(p)

        return `"${httpRoute}": ${pathToId[p]}`
      })
      .join(",\n")}
  }
  `
  )

  const pkgRaw = await fs.readFile(
    path.join(packageDir, "package.json"),
    "utf-8"
  )
  const pkg = JSON.parse(pkgRaw)

  await esbuild.build({
    entryPoints: [path.join(tempDir, "index.ts")],
    outfile: "./built.js",
    bundle: true,
    platform: "node",
    format: "esm",
    treeShaking: true,
    external: [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.devDependencies),
    ],
    plugins: [
      {
        name: "allowed-imports",
        setup(build) {
          build.onLoad({ filter: /.*/ }, (args) => {
            const isImportAllowed = micromatch.isMatch(
              args.path,
              opts.allowedImportPatterns ?? []
            )

            if (
              args.path.includes(".nextlove/extract-route-specs-temp") ||
              isImportAllowed
            ) {
              return
            }

            return { contents: `export default {}` }
          })
        },
      },
    ],
  })

  await fs.rm(tempDir, { recursive: true })
}
