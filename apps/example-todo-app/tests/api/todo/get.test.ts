import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

const routeTest = (path: string) => async (t) => {
  const { axios } = await getTestServer(t)

  const noAuthRes = await axios.get(path).catch((err) => err)
  t.is(noAuthRes.status, 401)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const invalidMethodRes = await axios.post(path).catch((err) => err)
  t.is(invalidMethodRes.status, 405)

  const invalidIdFormatRes = await axios
    .get(`${path}?id=someId`)
    .catch((err) => err)
  t.is(invalidIdFormatRes.status, 400)

  const nonExistentIdRes = await axios
    .get(`${path}?id=${uuidv4()}`)
    .catch((err) => err)
  t.is(nonExistentIdRes.status, 404)

  // Test 200 response
  const successfulRes = await axios
    .get(`${path}?id=${TODO_ID}`)
    .catch((err) => err)
  t.is(successfulRes.status, 200)
}

test("GET /todo/get/", routeTest("/todo/get"))
test("GET /todo/get/edge", routeTest("/todo/get/edge"))
