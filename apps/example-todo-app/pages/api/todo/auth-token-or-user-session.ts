import { withRouteSpec } from "lib/middlewares"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  auth: ["auth_token", "user_session"],
  jsonResponse: z.object({
    ok: z.boolean(),
    auth_type: z.enum(["auth_token", "user_session"]),
  }),
} as const)(async (req, res) => {
  return res.status(200).json({ ok: true, auth_type: req.auth.authorized_by })
})
