import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"
import { formData } from "pages/api/todo/form-add"

test("POST /todo/form-add", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const bodyFormData = new URLSearchParams()
  bodyFormData.append("title", "test title")

  const successfulRes = await axios({
    method: "POST",
    url: "/todo/form-add",
    data: bodyFormData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).catch((err) => err)

  t.is(successfulRes.status, 200)
})
