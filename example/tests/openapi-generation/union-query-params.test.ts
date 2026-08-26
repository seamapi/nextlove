import test from "ava"
import { generateOpenAPI } from "nextlove/generators"

test("generateOpenAPI flattens union commonParams into query parameters", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  // /api/todo/get-by-key declares commonParams as
  // z.union([{ todo_id }, { todo_key }]); its semantic GET operation should
  // carry one query parameter per union branch property.
  const operation = openapiJson.paths["/api/todo/get-by-key"].get
  t.truthy(operation)

  const parameters: Array<{ name: string; in: string; required?: boolean }> =
    operation.parameters
  t.deepEqual(parameters.map(({ name }) => name).sort(), [
    "todo_id",
    "todo_key",
  ])
  t.true(parameters.every(({ in: location }) => location === "query"))

  // Each parameter is required only within its own branch, so neither is
  // required overall.
  t.true(parameters.every(({ required }) => required !== true))

  const todo_id_parameter = parameters.find(({ name }) => name === "todo_id")
  t.like(todo_id_parameter, {
    schema: { type: "string", format: "uuid" },
  })
})
