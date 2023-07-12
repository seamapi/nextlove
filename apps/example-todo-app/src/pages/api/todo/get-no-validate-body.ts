import {
  checkRouteSpec,
  withRouteSpecWithoutValidateGetRequestBody,
} from "src/lib/middlewares"
import { NotFoundException } from "nextlove"
import { TODO_ID } from "tests/fixtures"
import { z } from "zod"

export const route_spec = checkRouteSpec({
  methods: ["GET", "POST"],
  auth: "auth_token",
  jsonBody: z.object({ name: z.string() }),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpecWithoutValidateGetRequestBody(route_spec)(
  async (req, res) => {
    return res.status(200).json({ ok: true })
  }
)
