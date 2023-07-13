import { checkRouteSpec, withRouteSpec } from "@/lib/middlewares"
import { z } from "zod"

export const commonParams = z.object({
  ids: z.array(z.string().uuid()).optional(),
})

export const route_spec = checkRouteSpec({
  methods: ["GET"],
  auth: "auth_token",
  commonParams,
  jsonResponse: z.object({
    ok: z.boolean(),
    todos: z
      .object({
        id: z.string().uuid(),
      })
      .array(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { ids } = req.commonParams

  const todos = ids ? ids.map((id) => ({ id })) : []

  return res.status(200).json({ ok: true, todos })
})
