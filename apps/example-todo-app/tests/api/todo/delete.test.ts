import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("DELETE /todo/delete", async (t) => {
  const { axios } = await getTestServer(t)

  // Test 401 response (no auth)
  const noAuthRes = await axios.delete("/todo/delete").catch((err) => err)
  t.is(noAuthRes.status, 401)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  // Test 500 response (invalid method)
  const invalidMethodRes = await axios.get("/todo/delete").catch((err) => err)
  t.is(invalidMethodRes.status, 500)

  // Test 500 response (invalid id format)
  const invalidIdFormatRes = await axios
    .delete("/todo/delete", { data: { id: "someId" } })
    .catch((err) => err)
  t.is(invalidIdFormatRes.status, 500)

  // Test 500 response (invalid id type)
  const invalidIdTypeRes = await axios
    .delete("/todo/delete", { data: { id: 123 } })
    .catch((err) => err)
  t.is(invalidIdTypeRes.status, 500)

  // Test 500 response (non-existent id)
  const nonExistentIdRes = await axios
    .delete("/todo/delete", { data: { id: uuidv4() } })
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 500)

  // Test 200 response
  const successfulRes = await axios
    .delete("/todo/delete", { data: { id: TODO_ID } })
    .catch((err) => err)
  t.is(successfulRes.status, 200)
})
