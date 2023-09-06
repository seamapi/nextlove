import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

const routeTest = (path: string) => async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const ids = [uuidv4(), uuidv4()]

  const responseWithArray = await axios.get(path, {
    params: {
      ids,
    },
  })

  t.deepEqual(responseWithArray.data, {
    ok: true,
    todos: ids.map((id) => ({
      id,
    })),
  })

  const responseWithCommas = await axios.get(path, {
    params: {
      ids: ids.join(","),
    },
  })

  t.deepEqual(responseWithCommas.data, {
    ok: true,
    todos: ids.map((id) => ({
      id,
    })),
  })

  const responseWithOptionalIds = await axios.get(path)

  t.deepEqual(responseWithOptionalIds.data, {
    ok: true,
    todos: [],
  })
}

test("GET /todo/list-optional-ids", routeTest("/todo/list-optional-ids"))
test(
  "GET /todo/list-optional-ids/edge",
  routeTest("/todo/list-optional-ids/edge")
)
