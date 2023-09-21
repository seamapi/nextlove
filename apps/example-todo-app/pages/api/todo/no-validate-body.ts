import {
  checkRouteSpec,
  withRouteSpecWithoutValidateGetRequestBody,
} from "lib/middlewares"
import { z } from "zod"

export const route_spec = checkRouteSpec({
  methods: ["GET", "DELETE", "POST"],
  auth: "auth_token",
  jsonBody: z.object({ name: z.string() }),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpecWithoutValidateGetRequestBody(route_spec)(
  async (_, res) => {
    return res.status(200).json({ ok: true })
  }
)
