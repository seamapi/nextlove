#!/usr/bin/env node

const argv = require("minimist")(process.argv.slice(2))
const { register } = require("esbuild-register/dist/node")

const { unregister } = register({
  target: `node${process.version.slice(1)}`,
})

if (argv.help || argv.h) {
  console.log(
`
nextlove generate-openapi [options]

  --packageDir <path>  Path to the package directory containing the Next.js app
  --outputFile <path>  Path to the output file
  --pathGlob <glob>    Glob pattern to find API route files
  --apiPrefix <path>   Prefix for API routes, default: "/"

`.trim())
  process.exit(0)
}

if (argv._[0] === "generate-openapi") {
  if (argv._.length === 2) {
    argv.packageDir = argv._[1]
  }
  if (argv["package-dir"]) {
    argv.packageDir = argv["package-dir"]
  }
  if (!argv["packageDir"]) throw new Error("Missing --packageDir")

  require("./dist/generate-openapi")
    .generateOpenAPI(argv)
    .then((result) => {
      if (!argv.outputFile) {
        console.log(result)
      }
    })
}
