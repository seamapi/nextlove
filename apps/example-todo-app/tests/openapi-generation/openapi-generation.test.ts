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
