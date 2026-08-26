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

test("generateOpenAPI marks a union query route as having required parameters", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )

  // Every branch of /api/todo/get-by-key's union requires its own property,
  // so the request does require a parameter even though no single parameter
  // is required on its own.
  const operation = openapiJson.paths["/api/todo/get-by-key"].get
  t.true(operation["x-has-required-parameters"])

  const parameters: Array<{ required?: boolean }> = operation.parameters
  t.true(parameters.every(({ required }) => required !== true))

  // /api/todo/get-by-mixed-key has a branch that requires nothing, so the
  // request can be made with no parameter at all. The extension is absent
  // and consumers fall back to their own derivation.
  const mixed_operation = openapiJson.paths["/api/todo/get-by-mixed-key"].get
  t.is(mixed_operation["x-has-required-parameters"], undefined)

  // A plain object query schema needs no extension: its required parameters
  // are individually marked, so deriving from the parameter list is correct.
  const plain_operation = openapiJson.paths["/api/todo/get"].get
  t.is(plain_operation["x-has-required-parameters"], undefined)
})
