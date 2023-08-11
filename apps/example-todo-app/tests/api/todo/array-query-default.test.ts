import qs from "qs"
import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("GET /todo/array-query-default (comma-separated array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get("/todo/array-query-default", {
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

test("GET /todo/array-query-default (bracket array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get("/todo/array-query-default", {
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

test("GET /todo/array-query-default (repeated array values)", async (t) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get("/todo/array-query-default", {
    params: {
      ids: ["1", "2", "3"],
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "repeat" })
    },
  })

  t.is(status, 200)
  t.deepEqual(ids, ["1", "2", "3"])
})
