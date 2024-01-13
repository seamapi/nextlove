import * as fs from "node:fs/promises"
import crypto from "node:crypto"
import path from "node:path"
import { Project, SyntaxKind } from "ts-morph"
import * as esbuild from "esbuild"
import micromatch from "micromatch"
import { defaultMapFilePathToHTTPRoute } from "./lib/default-map-file-path-to-http-route"

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
  esbuildOptions?: esbuild.BuildOptions
}

export const extractRouteSpecs = async (opts: GenerateRouteTypesOpts) => {
  const { packageDir, pathGlob = "/pages/api/**/*.ts" } = opts
  const fullPathGlob = path.posix.join(packageDir, pathGlob)

  const project = new Project({ compilerOptions: { declaration: true } })

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

    // Remove all unused imports so file can be tree shaken
    // (Assumes all imports are free of side-effects)
    let lastWidth: number
    do {
      lastWidth = sourceFile.getFullWidth()
      // May need to call this multiple times
      sourceFile.fixUnusedIdentifiers()
    } while (lastWidth !== sourceFile.getFullWidth())

    const absolutePackageDir = path.resolve(packageDir)
    const relativePath = path.relative(
      absolutePackageDir,
      sourceFile.getFilePath()
    )
    paths.push(relativePath)
  }

  const pathToId: Record<string, string> = {}
  for (const path of paths) {
    // add prefix to avoid starting with a number
    pathToId[path] =
      "hash" + crypto.createHash("sha256").update(path).digest("hex")
  }

  const entryPointContent = `
  ${paths
    .map((p) => `import {extractedRouteSpec as ${pathToId[p]}} from "./${p}"`)
    .join("\n")}

  export const routes = {
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

  // Copy allowed import globs into project
  if (opts.allowedImportPatterns) {
    project.addSourceFilesAtPaths(opts.allowedImportPatterns)
  }

  // Generate types (.d.ts)
  const entryPoint = project.createSourceFile(
    "extracted-route-specs.ts",
    entryPointContent
  )
  const emitResult = entryPoint.getEmitOutput({ emitOnlyDtsFiles: true })
  if (opts.outputFile) {
    const declarationFilePath = path.join(
      path.dirname(opts.outputFile),
      path.basename(opts.outputFile).replace(".mjs", "").replace(".js", "") +
        ".d.ts"
    )
    await fs.writeFile(
      declarationFilePath,
      emitResult.getOutputFiles()[0].getText()
    )
  }

  // Generate values (.js)
  const pkgRaw = await fs.readFile(
    path.join(packageDir, "package.json"),
    "utf-8"
  )
  const pkg = JSON.parse(pkgRaw)

  await esbuild.build({
    ...opts.esbuildOptions,
    stdin: {
      contents: entryPointContent,
      resolveDir: path.resolve(packageDir),
    },
    outfile: opts.outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    treeShaking: true,
    external: [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.devDependencies),
      ...(opts.esbuildOptions?.external ?? []),
    ],
    plugins: [
      // With this plugin, esbuild will never touch the actual filesystem and thus cannot interact with imports that don't match allowedImportPatterns[].
      {
        name: "resolve-virtual-fs",
        setup(build) {
          build.onLoad({ filter: /.*/ }, (args) => {
            const contents = project.getSourceFile(args.path)?.getFullText()
            if (!contents) {
              return {
                contents: "export default {}",
                loader: "ts",
              }
            }

            return {
              contents,
              loader: "ts",
              resolveDir: path.dirname(args.path),
            }
          })
        },
      },
      ...(opts.esbuildOptions?.plugins ?? []),
    ],
  })
}
