import test from "ava"
import { generateOpenAPI } from "nextlove"

const expectedProperties = {
  openapi: '3.0.0',
  info: { title: 'TODO API', version: '1.0.0' },
  servers: [{ url: 'https://example.com' }],
  tags: [],
  paths: {
    '/api/todo/add-ignore-invalid-json-response': { post: [Object] },
    '/api/todo/add-invalid-json-response': { post: [Object] },
    '/api/todo/add': { post: [Object] },
    '/api/todo/array-query-brackets': { get: [Object] },
    '/api/todo/array-query-comma': { get: [Object] },
    '/api/todo/array-query-default': { get: [Object] },
    '/api/todo/array-query-repeat': { get: [Object] },
    '/api/todo/delete-common-params': { delete: [Object] },
    '/api/todo/exclude-from-openapi': { post: [Object] },
    '/api/todo/form-add': { post: [Object] },
    '/api/todo/get': { get: [Object] },
    '/api/todo': { get: [Object] },
    '/api/todo/list-optional-ids': { get: [Object] },
    '/api/todo/list-with-refine': { get: [Object] },
    '/api/todo/list': { get: [Object] },
    '/api/todo/no-validate-body': { post: [Object] }
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
