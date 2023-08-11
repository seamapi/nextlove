import qs from "qs"
import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("GET /todo/array-query-comma (comma-separated array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get("/todo/array-query-comma", {
    params: {
      ids: ["1", "2", "3"],
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "comma" })
    },
  })

  t.is(status, 200)
  t.deepEqual(ids, ["1", "2", "3"])
})

test("GET /todo/array-query-comma (bracket array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    response: { error },
    status,
  } = await axios
    .get("/todo/array-query-comma", {
      params: {
        ids: ["1", "2", "3"],
      },
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: "brackets" })
      },
    })
    .catch((r) => r)

  t.is(status, 400)
  t.is(error.message, `Bracket syntax not supported for query param "ids"`)
})

test("GET /todo/array-query-comma (repeated array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    response: { error },
    status,
  } = await axios
    .get("/todo/array-query-comma", {
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
