import { generateRouteSpec, withRouteSpec } from "lib/middlewares"
import { z } from "zod"

export const jsonBody = z.object({
  todo_title: z.string().uuid(),
  checked: z.string().uuid(),
})

export const route_spec = generateRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  jsonBody,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { checked, todo_title } = req.body as z.infer<typeof jsonBody>

  return res.status(200).json({ ok: true })
})
