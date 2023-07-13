import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("DELETE /todo/delete-common-params", async (t) => {
  const { axios } = await getTestServer(t)

  const noAuthRes = await axios
    .delete("/api/todo/delete-common-params")
    .catch((err) => err)
  t.is(noAuthRes.status, 401, "no auth")

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const invalidMethodRes = await axios
    .get("/api/todo/delete-common-params")
    .catch((err) => err)
  t.is(invalidMethodRes.status, 405, "invalid method")

  const invalidIdFormatRes = await axios
    .delete("/api/todo/delete-common-params", { data: { id: "someId" } })
    .catch((err) => err)
  t.is(invalidIdFormatRes.status, 400, "invalid id format")

  const invalidIdTypeRes = await axios
    .delete("/api/todo/delete-common-params", { data: { id: 123 } })
    .catch((err) => err)
  t.is(invalidIdTypeRes.status, 400, "invalid id type")

  const nonExistentIdRes = await axios
    .delete("/api/todo/delete-common-params", { data: { id: uuidv4() } })
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 404, "non-existent id")

  const successfulRes = await axios
    .delete("/api/todo/delete-common-params", { data: { id: TODO_ID } })
    .catch((err) => err)
  t.is(successfulRes.status, 200)
})
