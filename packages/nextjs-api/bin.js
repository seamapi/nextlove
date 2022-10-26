#! /usr/bin/node

const argv = require("minimist")(process.argv.slice(2))

if (argv._[0] === "generate-openapi") {
  // TODO accept syntax like --package-dir
  if (!argv["packageDir"]) throw new Error("Missing --packageDir")
  if (!argv["apiName"]) throw new Error("Missing --apiName")
  require("./dist/generate-openapi").generateOpenAPI({
    packageDir: argv["packageDir"],
    apiName: argv["apiName"],
  })
}
