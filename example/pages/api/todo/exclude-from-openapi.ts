import { checkRouteSpec } from "nextlove"
import { withRouteSpec } from "lib/middlewares"
import { z } from "zod"

export const jsonBody = z.object({})

export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "none",
  jsonBody,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
  excludeFromOpenApi: true,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  return res.status(200).json({ ok: true })
})
