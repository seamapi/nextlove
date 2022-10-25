import { generateRouteSpec, withRouteSpec } from "lib/middlewares"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

export const jsonBody = z.object({
  id: z.string().uuid().optional().default(uuidv4()),
  title: z.string(),
  completed: z.boolean().optional().default(false),
})

export const route_spec = generateRouteSpec({
  methods: ["POST"],
  auth: "auth_token" as const,
  jsonBody,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  req.auth_type
  return res.status(200).json({ ok: true })
})
