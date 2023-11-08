import test from "ava"
import { TODO_ID } from "tests/fixtures"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"
import { formData } from "pages/api/todo/form-add"
import { withRouteSpec } from "lib/middlewares"
import * as  z from "zod"

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

test("Workspace supports an optional object of formData", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  withRouteSpec({
    auth: "support",
    methods: ["GET", "POST"],
    queryParams: z.object({
      workspace_id: z.string(),
    }),
    formData: z
      .object([
        z.any(),
        z.object({
          clear_sandbox_state: z.literal("clear_sandbox_state"),
        }),
      ])
      .optional(),
  } as const)

  const successfulRes = await axios({
    method: "POST",
    url: "/todo/form-add",
    data: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).catch((err) => err)

  t.is(successfulRes.status, 200)
})
