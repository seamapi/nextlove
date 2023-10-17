import test from "ava"
import { generateOpenAPI } from "nextlove"

test("paths which were excluded from openAPI generation should not be generated", async (t) => {
  const generatedOpenApiPaths = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  ).paths

  const excludedPath = Object.keys(generatedOpenApiPaths).includes("/api/todo/exclude-from-openapi")

  // excluded path should not be rendered by generateOpenAPI
  t.false(excludedPath, "/api/todo/exclude-from-openapi")
})