import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

const routeTest = (path: string) => async (t) => {
  const { axios } = await getTestServer(t)

  const noAuthRes = await axios
    .post(path, { title: "Todo Title" })
    .catch((err) => err)
  t.is(noAuthRes.status, 401, "no auth")

  const hasErrorStack = Boolean(noAuthRes.response.error.stack)
  t.is(hasErrorStack, true)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const invalidMethodRes = await axios.get(path).catch((err) => err)
  t.is(invalidMethodRes.status, 405, "invalid method")

  const invalidBodyParamTypeRes = await axios
    .post(path, { title: true })
    .catch((err) => err)
  t.is(invalidBodyParamTypeRes.status, 400, "bad body")

  const nonExistentIdRes = await axios
    .post(path, { invalidParam: "invalidParam" })
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 400, "invalid param")

  const successfulRes = await axios
    .post("/todo/add", { title: "Todo Title" })
    .catch((err) => err)
  t.is(successfulRes.status, 200)
}

test("POST /todo/add", routeTest("/todo/add"))
test("POST /todo/add/edge", routeTest("/todo/add/edge"))
