import test from "ava"
import getTestServer from "../../fixtures/get-test-server"

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
