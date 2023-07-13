import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("GET /todo/get", async (t) => {
  const { axios } = await getTestServer(t)

  const noAuthRes = await axios.get("/api/todo/get").catch((err) => err)
  t.is(noAuthRes.status, 401)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const invalidMethodRes = await axios.post("/api/todo/get").catch((err) => err)
  t.is(invalidMethodRes.status, 405)

  const invalidIdFormatRes = await axios
    .get("/api/todo/get?id=someId")
    .catch((err) => err)
  t.is(invalidIdFormatRes.status, 400)

  const nonExistentIdRes = await axios
    .get(`/api/todo/get?id=${uuidv4()}`)
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 404)

  // Test 200 response
  const successfulRes = await axios
    .get(`/api/todo/get?id=${TODO_ID}`)
    .catch((err) => err)
  t.is(successfulRes.status, 200)
})
