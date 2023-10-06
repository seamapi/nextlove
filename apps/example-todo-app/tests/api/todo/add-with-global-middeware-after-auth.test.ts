import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("POST /todo/add-with-global-middeware-after-auth", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const successfulRes = await axios
    .post("/todo/add-with-global-middeware-after-auth", { title: "Todo Title" })
    .catch((err) => err)
  t.is(successfulRes.status, 200)
  t.is(successfulRes.data.ok, true)
  t.is(successfulRes.data.auth.authorized_by, "auth_token")
  t.is(successfulRes.data.auth.seam, "withGlobalMiddlewareAfterAuth")
})
