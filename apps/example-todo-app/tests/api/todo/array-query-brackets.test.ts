import qs from "qs"
import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("GET /todo/array-query-brackets (comma-separated array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    response: { error },
    status,
  } = await axios
    .get("/todo/array-query-brackets", {
      params: {
        ids: ["1", "2", "3"],
      },
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: "comma" })
      },
    })
    .catch((r) => r)

  t.is(status, 400)
  // Zod 4 prefixes with "Invalid input: " so we check for the core message
  t.true(error.message.includes('expected array, received string for "ids"'))
})

test("GET /todo/array-query-brackets (bracket array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get("/todo/array-query-brackets", {
    params: {
      ids: ["1", "2", "3"],
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "brackets" })
    },
  })

  t.is(status, 200)
  t.deepEqual(ids, ["1", "2", "3"])
})

test("GET /todo/array-query-brackets (repeated array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    response: { error },
    status,
  } = await axios
    .get("/todo/array-query-brackets", {
      params: {
        ids: ["1", "2", "3"],
      },
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: "repeat" })
      },
    })
    .catch((r) => r)

  t.is(status, 400)
  t.is(
    error.message,
    `Repeated parameters not supported for duplicate query param "ids"`
  )
})
