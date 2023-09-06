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
    response: { error },
    status,
  } = await axios
    .get(path, {
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
}

const routeTestRepeated = (path: string) => async (t: ExecutionContext) => {
  const { axios } = await getTestServer(t)

  const {
    data: { ids },
    status,
  } = await axios
    .get(path, {
      params: {
        ids: ["1", "2", "3"],
      },
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: "repeat" })
      },
    })
    .catch((r) => r)

  t.is(status, 200)
  t.deepEqual(ids, ["1", "2", "3"])
}

test.serial(
  "GET /todo/array-query-comma (comma-separated array values)",
  routeTestCommaSeparated("/todo/array-query-comma")
)
test.serial(
  "GET /todo/array-query-comma/edge (comma-separated array values)",
  routeTestCommaSeparated("/todo/array-query-comma/edge")
)

test.serial(
  "GET /todo/array-query-comma (bracket syntax)",
  routeTestBracket("/todo/array-query-comma")
)
test.serial(
  "GET /todo/array-query-comma/edge (bracket syntax)",
  routeTestBracket("/todo/array-query-comma/edge")
)

test.serial(
  "GET /todo/array-query-comma (repeated syntax)",
  routeTestRepeated("/todo/array-query-comma")
)
test.serial(
  "GET /todo/array-query-comma/edge (repeated syntax)",
  routeTestRepeated("/todo/array-query-comma/edge")
)
