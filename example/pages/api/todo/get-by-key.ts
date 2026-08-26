import { withRouteSpec } from "../../../lib/middlewares"
import { z } from "zod"

export const route_spec = {
  methods: ["GET", "POST"],
  auth: "auth_token",
  commonParams: z.union([
    z.object({ todo_id: z.string().uuid() }),
    z.object({ todo_key: z.string() }),
  ]),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
} as const

export default withRouteSpec(route_spec)(async (_, res) => {
  return res.status(200).json({ ok: true })
})
