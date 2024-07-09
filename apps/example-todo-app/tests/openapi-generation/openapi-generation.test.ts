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

test("generateOpenAPI correctly parses nullable params", async (t) => {
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

test("generateOpenAPI marks properties with null unions as nullable", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post
  const metadataParam =
    routeSpec.requestBody.content["application/json"].schema.properties.metadata

  t.truthy(metadataParam)
  t.is(metadataParam.type, "object")
  t.true(metadataParam.additionalProperties.nullable)
  t.true(
    metadataParam.additionalProperties.oneOf.every(
      (schema) => schema.type !== "null"
    )
  )
})

test("generateOpenAPI marks null params with nullable flag", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post
  const testNullParam =
    routeSpec.requestBody.content["application/json"].schema.properties.testNull

  t.truthy(testNullParam)
  t.falsy(testNullParam.type)
  t.true(testNullParam.nullable)
})

test("generateOpenAPI correctly parses description with front matter", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post

  t.truthy(routeSpec.description)
  t.is(
    routeSpec.description.trim(),
    "This endpoint allows you to add a new todo item to the list. Deprecated."
  )
  t.is(routeSpec.deprecated, "Use foobar instead.")
})
