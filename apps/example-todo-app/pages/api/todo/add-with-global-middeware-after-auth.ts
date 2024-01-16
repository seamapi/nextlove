import { withRouteSpecWithGlobalMiddlewareAfterAuth } from "lib/middlewares"
import { checkRouteSpec } from "nextlove"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

export const jsonBody = z.object({
  id: z.string().uuid().optional().default(uuidv4()),
  title: z.string(),
  completed: z.boolean().optional().default(false),
})

export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  jsonBody,
  jsonResponse: z.object({
    ok: z.boolean(),
    auth: z.object({
      authorized_by: z.literal("auth_token"),
      seam: z.literal("withGlobalMiddlewareAfterAuth"),
    }),
  }),
})

export default withRouteSpecWithGlobalMiddlewareAfterAuth(route_spec)(
  async (req, res) => {
    return res.status(200).json({ ok: true, auth: req.auth })
  }
)
