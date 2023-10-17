import test from "ava"
import { generateOpenAPI } from "nextlove"

test("should generate openapi with expected properties", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )
  console.log(openapiJson)
  t.deepEqual(typeof openapiJson, 'object')
})
