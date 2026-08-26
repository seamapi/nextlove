import test from "ava"
import { generateOpenAPI } from "nextlove/generators"

test("generateOpenAPI applies apiDescription, externalDocs, and infoExtensions", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
      apiDescription: `
        Prefer the official SDKs over hand-written HTTP calls.

        Direct HTTP callers must serialize query parameters compatibly.
      `,
      externalDocs: {
        description: "API documentation",
        url: "https://example.com/docs",
      },
      infoExtensions: {
        "x-sdks": [
          { language: "javascript", url: "https://example.com/js-sdk" },
        ],
      },
    })
  )

  // Dedented and trimmed, with the blank line between paragraphs preserved.
  t.is(
    openapiJson.info.description,
    "Prefer the official SDKs over hand-written HTTP calls.\n\nDirect HTTP callers must serialize query parameters compatibly."
  )

  t.deepEqual(openapiJson.externalDocs, {
    description: "API documentation",
    url: "https://example.com/docs",
  })

  t.deepEqual(openapiJson.info["x-sdks"], [
    { language: "javascript", url: "https://example.com/js-sdk" },
  ])

  // Untouched fields keep their existing behavior.
  t.is(typeof openapiJson.info.title, "string")
  t.is(openapiJson.info.version, "1.0.0")
})

test("generateOpenAPI omits description and externalDocs when not provided", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  t.false("description" in openapiJson.info)
  t.false("externalDocs" in openapiJson)
})
