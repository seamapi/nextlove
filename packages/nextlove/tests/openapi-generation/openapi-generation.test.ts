import test from "ava"
import { generateOpenAPI } from "../../src/generators/generate-openapi"
// import mockFs from "mock-fs"

// test.before((t) => {
//   // Setup mock file system
//   mockFs({
//     "/testdir": {
//       "package.json": "",
//       "src/pages": {
//         "health.ts": `

//         `
//       }
//     },
//   })
// })

// test.after.always((t) => {
//   // Restore file system
//   mockFs.restore()
// })

test("should generate openapi", async (t) => {
  const openapiFile = await generateOpenAPI({
    packageDir: "../../apps/example-todo-app",
  })

  console.log(openapiFile)
})
