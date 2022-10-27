#!/usr/bin/env node

const argv = require("minimist")(process.argv.slice(2))
const { register } = require("esbuild-register/dist/node")

const { unregister } = register({
  target: `node${process.version.slice(1)}`,
})

if (argv._[0] === "generate-openapi") {
  if (argv._.length === 2) {
    argv.packageDir = argv._[1]
  }
  if (argv["package-dir"]) {
    argv.packageDir = argv["package-dir"]
  }
  if (!argv["packageDir"]) throw new Error("Missing --packageDir")

  require("./dist/generate-openapi")
    .generateOpenAPI({
      packageDir: argv["packageDir"],
    })
    .then((result) => {
      if (!argv.outputFile) {
        console.log(result)
      }
    })
}
