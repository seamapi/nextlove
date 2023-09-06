import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

const routeTest = (path: string) => async (t) => {
  const { axios } = await getTestServer(t)
  axios.defaults.headers.common.Authorization = `Bearer auth_token`
  const successfulRes = await axios.get(path)
  t.is(successfulRes.status, 200)
}

test("GET /todo/get-no-validate-body", routeTest("/todo/get-no-validate-body"))
test(
  "GET /todo/get-no-validate-body/edge",
  routeTest("/todo/get-no-validate-body/edge")
)
