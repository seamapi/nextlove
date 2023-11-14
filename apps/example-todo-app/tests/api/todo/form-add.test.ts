import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import qs from "qs"

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

test("Valid formData object passes validation and returns successful response", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const validFormData = {
    title: "test title",
    clear_sandbox_state: "clear_sandbox_state",
  }

  const formDataString = qs.stringify(validFormData)

  const successfulRes = await axios({
    method: "POST",
    url: "/todo/form-add",
    data: formDataString,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).catch((err) => err)

  const formDataSchema = z
    .object({
      title: z.string(),
      clear_sandbox_state: z.literal("clear_sandbox_state"),
    })
    .safeParse(validFormData)

  t.true(formDataSchema.success)
  t.is(successfulRes.status, 200)
})
