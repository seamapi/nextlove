import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("GET /todo/no-validate-body", async (t) => {
  const { axios } = await getTestServer(t)
  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const getRes = await axios.get(`/todo/no-validate-body`)
  t.is(getRes.status, 200)

  const deleteRes = await axios.delete(`/todo/no-validate-body`)
  t.is(deleteRes.status, 200)

  try {
    await axios.post(`/todo/no-validate-body`)
  } catch (e) {
    t.is(e.status, 400)
  }
})
