import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("POST /todo/form-add-with-default with optional form data", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const bodyFormData = {
    id: "test-id",
    completed: true,
  }

  const resWithFormData = await axios({
    method: "POST",
    url: "/todo/form-add-with-default",
    data: bodyFormData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).catch((err) => err)

  t.is(resWithFormData.status, 200)

  const resWithoutData = await axios({
    method: "POST",
    url: "/todo/form-add-with-default",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).catch((err) => err)

  t.is(resWithoutData.status, 200)
})
