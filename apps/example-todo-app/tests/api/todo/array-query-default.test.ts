import qs from "qs"
import test, { ExecutionContext } from "ava"
import getTestServer from "tests/fixtures/get-test-server"

const routeTestCommaSeparated =
  (path: string) => async (t: ExecutionContext) => {
    const { axios } = await getTestServer(t)

    const {
      data: { ids },
      status,
    } = await axios.get(path, {
      params: {
        ids: ["1", "2", "3"],
      },
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: "comma" })
      },
    })

    t.is(status, 200)
    t.deepEqual(ids, ["1", "2", "3"])
  }

const routeTestBracket = (path: string) => async (t: ExecutionContext) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get(path, {
    params: {
      ids: ["1", "2", "3"],
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "brackets" })
    },
  })

  t.is(status, 200)
  t.deepEqual(ids, ["1", "2", "3"])
}

const routeTestRepeated = (path: string) => async (t: ExecutionContext) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios.get(path, {
    params: {
      ids: ["1", "2", "3"],
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "repeat" })
    },
  })

  t.is(status, 200)
  t.deepEqual(ids, ["1", "2", "3"])
}

test.serial(
  "GET /todo/array-query-default (comma-separated array values)",
  routeTestCommaSeparated("/todo/array-query-default")
)
test.serial(
  "GET /todo/array-query-default/edge (comma-separated array values)",
  routeTestCommaSeparated("/todo/array-query-default/edge")
)

test.serial(
  "GET /todo/array-query-default (bracket array values)",
  routeTestBracket("/todo/array-query-default")
)
test.serial(
  "GET /todo/array-query-default/edge (bracket array values)",
  routeTestBracket("/todo/array-query-default/edge")
)

test.serial(
  "GET /todo/array-query-default (repeated array values)",
  routeTestRepeated("/todo/array-query-default")
)
test.serial(
  "GET /todo/array-query-default/edge (repeated array values)",
  routeTestRepeated("/todo/array-query-default/edge")
)
