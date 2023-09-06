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
}

test("GET /todo/list", routeTest("/todo/list"))
test("GET /todo/list/edge", routeTest("/todo/list/edge"))
