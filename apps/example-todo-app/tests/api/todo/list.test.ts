import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("GET /todo/list", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const ids = [uuidv4(), uuidv4()]

  const responseWithArray = await axios.get("/todo/list", {
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

  const responseWithCommas = await axios.get("/todo/list", {
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
})

test.only("GET /todo/list/edge", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const ids = [uuidv4(), uuidv4()]

  const responseWithArray = await axios.get("/todo/list/edge", {
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

  const responseWithCommas = await axios.get("/todo/list/edge", {
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
})
