import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"
import { AxiosError } from "axios"

test("GET /todo/multiple-auth-errors-handled-by-route", async (t) => {
  const { axios } = await getTestServer(t)

  return axios
    .get("/todo/multiple-auth-errors-handled-by-route")
    .catch((error: AxiosError) => {
      t.like(error.response, {
        error: {
          message: "No authentication methods succeeded",
          type: "unauthorized",
        },
      })
    })
})
