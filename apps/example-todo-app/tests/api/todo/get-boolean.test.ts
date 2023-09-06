import test from "ava"
import { TODO_ID } from "tests/fixtures"
import axiosAssert from "tests/fixtures/axios-assert"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

// test.failing("GET /todo/get", async (t) => {
const routeTest = (path: string) => async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const id = uuidv4()

  const invalidIdFormatRes = await axios
    .get(`${path}?id=${id}&throwError=false`)
    .catch((err) => err)

  t.is(invalidIdFormatRes.status, 200)
  t.like(invalidIdFormatRes.data, {
    ok: false,
    error: { type: "todo_not_found", message: `Todo ${id} not found` },
  })

  axiosAssert.throws(
    t,
    () => axios.get(`${path}?id=${id}&throwErrorAlwaysTrue=false`),
    {
      error: {
        type: "invalid_input",
        message: 'Must be true for "throwError"',
      },
    }
  )
}

test.failing("GET /todo/get-boolean", routeTest("/todo/get-boolean"))
test.failing("GET /todo/get-boolean/edge", routeTest("/todo/get-boolean/edge"))
