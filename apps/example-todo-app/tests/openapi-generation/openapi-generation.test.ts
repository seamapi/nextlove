import test from "ava"
import { generateOpenAPI } from "nextlove"

const expectedProperties = {
  openapi: '3.0.0',
  info: { title: 'TODO API', version: '1.0.0' },
  servers: [{ url: 'https://example.com' }],
  tags: [],
  paths: {
    '/api/todo/add-ignore-invalid-json-response': { post: {} },
    '/api/todo/add-invalid-json-response': { post: {} },
    '/api/todo/add': { post: {} },
    '/api/todo/array-query-brackets': { get: {} },
    '/api/todo/array-query-comma': { get: {} },
    '/api/todo/array-query-default': { get: {} },
    '/api/todo/array-query-repeat': { get: {} },
    '/api/todo/delete-common-params': { delete: {} },
    '/api/todo/exclude-from-openapi': { post: {} },
    '/api/todo/form-add': { post: {} },
    '/api/todo/get': { get: {} },
    '/api/todo': { get: {} },
    '/api/todo/list-optional-ids': { get: {} },
    '/api/todo/list-with-refine': { get: {} },
    '/api/todo/list': { get: {} },
    '/api/todo/no-validate-body': { post: {} },
  },
  components: {
    securitySchemes: { auth_token: [Object] },
    schemas: { todo: [Object], ok: [Object] }
  }
}

test("should generate openapi with expected properties", async (t) => {
  const openapiJson = JSON.parse(
    await generateOpenAPI({
      packageDir: ".",
    })
  )
  console.log(openapiJson)

  for (const endpoint in expectedProperties) {
    t.true(endpoint in openapiJson)
  }
})
