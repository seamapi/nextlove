import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("POST /todo/add", async (t) => {
  const { axios } = await getTestServer(t)

  // Test 401 response (no auth)
  const noAuthRes = await axios.post("/todo/add").catch((err) => err)
  t.is(noAuthRes.status, 401)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  // Test 500 response (invalid method)
  const invalidMethodRes = await axios.get("/todo/add").catch((err) => err)
  t.is(invalidMethodRes.status, 500)

  // Test 500 response (invalid body param type)
  const invalidBodyParamTypeRes = await axios
    .post("/todo/add", { title: true })
    .catch((err) => err)
  t.is(invalidBodyParamTypeRes.status, 500)

  // // Test 500 response (invalid param)
  const nonExistentIdRes = await axios
    .post("/todo/add", { invalidParam: "invalidParam" })
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 500)

  // Test 200 response
  const successfulRes = await axios
    .post("/todo/add", { title: "Todo Title" })
    .catch((err) => err)
  t.is(successfulRes.status, 200)
})
