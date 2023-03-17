import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("POST /todo/add-invalid-json-response", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const successfulRes = await axios
    .post("/todo/add-invalid-json-response", { title: "Todo Title" })
    .catch((err) => err)

  t.is(successfulRes.status, 500)
})
