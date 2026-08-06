import { checkRouteSpec } from "nextlove"
import { withRouteSpec } from "lib/middlewares"
import { z } from "zod"
import { HttpException } from "nextlove"
import { jsonBody } from "./add"

export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  formData: jsonBody,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  if (!req.body.title) {
    throw new HttpException(400, {
      message: "title is required",
      type: "title_required",
    })
  }
  return res.status(200).json({ ok: true })
})
