import test from "ava"
import { generateOpenAPI } from "nextlove"

test("should generate openapi", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  console.log(openapiJson)
})
