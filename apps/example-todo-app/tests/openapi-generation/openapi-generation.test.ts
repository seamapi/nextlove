import test from "ava"
import { generateOpenAPI } from "nextlove/generators"

test("should generate openapi with expected properties", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )
  t.deepEqual(typeof openapiJson, "object")
})

test("nullable param is correctly parsed", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post
  const descriptionParam =
    routeSpec.requestBody.content["application/json"].schema.properties
      .description

  t.truthy(descriptionParam)
  t.is(descriptionParam.type, "string")
  t.true(descriptionParam.nullable)
})
