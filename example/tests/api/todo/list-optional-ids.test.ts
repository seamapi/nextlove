import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("GET /todo/list-optional-ids", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const ids = [uuidv4(), uuidv4()]

  const responseWithArray = await axios.get("/todo/list-optional-ids", {
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

  const responseWithCommas = await axios.get("/todo/list-optional-ids", {
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

  const responseWithOptionalIds = await axios.get("/todo/list-optional-ids")

  t.deepEqual(responseWithOptionalIds.data, {
    ok: true,
    todos: [],
  })
})
