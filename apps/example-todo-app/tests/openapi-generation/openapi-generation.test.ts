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

test("generateOpenAPI correctly parses endpoint description with front matter and prefixes custom properties with 'x-'", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post

  t.truthy(routeSpec.description)
  t.is(
    routeSpec.description,
    "This endpoint allows you to add a new todo item to the list. Deprecated."
  )
  t.is(routeSpec["x-deprecated"], "Use foobar instead.")
  t.is(routeSpec["x-fern-sdk-return-value"], "foobar")
  t.is(routeSpec["x-response-key"], "foobar")
})

test("generateOpenAPI correctly parses property description with front matter and prefixes custom properties with 'x-'", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post
  const testUnusedParam =
    routeSpec.requestBody.content["application/json"].schema.properties.unused

  t.true(testUnusedParam.deprecated)
  t.is(testUnusedParam["x-title"], "Unused")
  t.is(testUnusedParam["x-deprecated"], "yes, because it's deprecated.")
  // snake case is correctly dashified
  t.is(testUnusedParam["x-snake-case"], "Snake case property")
})

test("generateOpenAPI correctly parses nested object description", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  const routeSpec = openapiJson.paths["/api/todo/add"].post
  const testArrayDescription =
    routeSpec.requestBody.content["application/json"].schema.properties
      .arrayDescription

  t.is(testArrayDescription["x-title"], "Array Description")
  t.is(testArrayDescription.description, "This is an array of strings.")
  t.is(testArrayDescription.items.type, "object")
  t.is(testArrayDescription.items.description, "This is an object.")
  t.is(testArrayDescription.items["x-title"], "Nested Object Description")
})
