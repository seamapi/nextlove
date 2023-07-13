import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("POST /todo/add", async (t) => {
  const { axios } = await getTestServer(t)

  const noAuthRes = await axios.post("/api/todo/add").catch((err) => err)
  t.is(noAuthRes.status, 401, "no auth")

  const hasErrorStack = Boolean(noAuthRes.response.error.stack)
  t.is(hasErrorStack, true)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const invalidMethodRes = await axios.get("/api/todo/add").catch((err) => err)
  t.is(invalidMethodRes.status, 405, "invalid method")

  const invalidBodyParamTypeRes = await axios
    .post("/api/todo/add", { title: true })
    .catch((err) => err)
  t.is(invalidBodyParamTypeRes.status, 400, "bad body")

  const nonExistentIdRes = await axios
    .post("/api/todo/add", { invalidParam: "invalidParam" })
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 400, "invalid param")

  const successfulRes = await axios
    .post("/api/todo/add", { title: "Todo Title" })
    .catch((err) => err)
  t.is(successfulRes.status, 200)
})
