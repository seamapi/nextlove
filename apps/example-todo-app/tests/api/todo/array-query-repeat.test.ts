import qs from "qs"
import test, { ExecutionContext } from "ava"
import getTestServer from "tests/fixtures/get-test-server"

const routeTestCommaSeparated =
  (path: string) => async (t: ExecutionContext) => {
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
          return qs.stringify(params, { arrayFormat: "comma" })
        },
      })
      .catch((r) => r)

    t.is(status, 400)
    t.is(error.message, `Expected array, received string for "ids"`)
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
  "GET /todo/array-query-repeat (comma-separated array values)",
  routeTestCommaSeparated("/todo/array-query-repeat")
)
test.serial(
  "GET /todo/array-query-repeat/edge (comma-separated array values)",
  routeTestCommaSeparated("/todo/array-query-repeat/edge")
)

test.serial(
  "GET /todo/array-query-repeat (bracket array values)",
  routeTestBracket("/todo/array-query-repeat")
)
test.serial(
  "GET /todo/array-query-repeat/edge (bracket array values)",
  routeTestBracket("/todo/array-query-repeat/edge")
)

test.serial(
  "GET /todo/array-query-repeat (repeated array values)",
  routeTestRepeated("/todo/array-query-repeat")
)
test.serial(
  "GET /todo/array-query-repeat/edge (repeated array values)",
  routeTestRepeated("/todo/array-query-repeat/edge")
)
