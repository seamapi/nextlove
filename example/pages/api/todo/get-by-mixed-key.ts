import { withRouteSpec } from "../../../lib/middlewares"
import { z } from "zod"

export const route_spec = {
  methods: ["GET", "POST"],
  auth: "auth_token",
  // Only two of the three branches require a property, so this route does
  // NOT require a parameter — it distinguishes `every` from `some`.
  commonParams: z.union([
    z.object({ todo_id: z.string().uuid() }),
    z.object({ todo_key: z.string() }),
    z.object({ todo_name: z.string().optional() }),
  ]),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
} as const

export default withRouteSpec(route_spec)(async (_, res) => {
  return res.status(200).json({ ok: true })
})
