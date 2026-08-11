#!/usr/bin/env node
// Route modules are TypeScript, and the generators import them at runtime.
import "tsx/esm"
import minimist from "minimist"

const argv = minimist(process.argv.slice(2))

if (argv.help || argv.h) {
  console.log(
    `
nextlove (generate-openapi | generate-route-types | extract-route-specs) [options]

  --packageDir <path>  Path to the package directory containing the Next.js app
  --outputFile <path>  Path to the output file
  --pathGlob <glob>    Glob pattern to find API route files
  --apiPrefix <path>   Prefix for API routes, default: "/api"

`.trim()
  )
  process.exit(0)
}

const resolvePackageDir = () => {
  if (argv._.length === 2) {
    argv.packageDir = argv._[1]
  }
  if (argv["package-dir"]) {
    argv.packageDir = argv["package-dir"]
  }
  if (!argv["packageDir"]) throw new Error("Missing --packageDir")
}

const report = (result) => {
  if (!argv.outputFile) {
    console.log(result)
  }
}

if (argv._[0] === "generate-openapi") {
  resolvePackageDir()
  const { generateOpenAPI } = await import("./generators/index.js")
  report(await generateOpenAPI(argv))
} else if (argv._[0] === "generate-route-types") {
  resolvePackageDir()
  const { generateRouteTypes } = await import("./generators/index.js")
  report(await generateRouteTypes(argv))
} else if (argv._[0] === "extract-route-specs") {
  resolvePackageDir()

  if (argv["allowed-import-patterns"]) {
    argv.allowedImportPatterns = Array.isArray(argv["allowed-import-patterns"])
      ? argv["allowed-import-patterns"]
      : [argv["allowed-import-patterns"]]
  }

  const { extractRouteSpecs } = await import("./generators/index.js")
  report(await extractRouteSpecs(argv))
}
