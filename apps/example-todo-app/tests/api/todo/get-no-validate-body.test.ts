import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("GET /todo/get", async (t) => {
  const { axios } = await getTestServer(t)
  axios.defaults.headers.common.Authorization = `Bearer auth_token`
  const successfulRes = await axios.get(`/todo/get-no-validate-body`)
  t.is(successfulRes.status, 200)
})
