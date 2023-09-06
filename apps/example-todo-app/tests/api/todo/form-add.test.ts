import test, { ExecutionContext } from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"
import { formData } from "pages/api/todo/form-add"

const routeTest = (path: string) => async (t: ExecutionContext) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const bodyFormData = new URLSearchParams()
  const title = "space test+title1234"
  bodyFormData.append("title", title)

  const successfulRes = await axios({
    method: "POST",
    url: path,
    data: bodyFormData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).catch((err) => err)

  t.is(successfulRes.status, 200)
  t.is(successfulRes.data.formData.title, title)
}

test("POST /todo/form-add", routeTest("/todo/form-add"))
test("POST /todo/form-add/edge", routeTest("/todo/form-add/edge"))
