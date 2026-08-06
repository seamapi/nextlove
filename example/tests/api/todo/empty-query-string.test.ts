import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("GET /todo/empty-query-string", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const res = await axios
    .get("/todo/empty-query-string?list=")
    .catch((err) => err)

  t.is(200, res.status)
  t.falsy(res.response?.message)
})
