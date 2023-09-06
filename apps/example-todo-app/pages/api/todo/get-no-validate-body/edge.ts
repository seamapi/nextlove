import { withRouteSpecEdgeWithoutValidateGetRequestBody } from "lib/middlewares"
import { z } from "zod"

export const route_spec = {
  methods: ["GET", "POST"],
  auth: "auth_token",
  jsonBody: z.object({ name: z.string() }),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
} as const

export const config = {
  runtime: "edge",
}

export default withRouteSpecEdgeWithoutValidateGetRequestBody(route_spec)(
  async (req, res) => {
    return res.status(200).json({ ok: true })
  }
)
