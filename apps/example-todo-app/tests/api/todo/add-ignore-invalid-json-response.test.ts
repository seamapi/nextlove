import test, { ExecutionContext } from "ava"
import getTestServer from "tests/fixtures/get-test-server"

const routeTest = (path: string) => async (t: ExecutionContext) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const successfulRes = await axios
    .post(path, { title: "Todo Title" })
    .catch((err) => err)

  t.is(successfulRes.status, 200)
}

test(
  "POST /todo/add-ignore-invalid-json-response",
  routeTest("/todo/add-ignore-invalid-json-response")
)
test(
  "POST /todo/add-ignore-invalid-json-response/edge",
  routeTest("/todo/add-ignore-invalid-json-response/edge")
)
