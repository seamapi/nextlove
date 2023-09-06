import { withRouteSpecEdge } from "lib/middlewares"
import { z } from "zod"
import * as ZT from "lib/zod"

export const commonParams = z.object({
  ids: z.array(z.string().uuid()).optional(),
})

export const route_spec = {
  methods: ["GET"],
  auth: "auth_token",
  commonParams,
  jsonResponse: z.object({
    ok: z.boolean(),
    todos: z.array(ZT.todo),
  }),
} as const

export const config = {
  runtime: "edge",
}

export default withRouteSpecEdge(route_spec)(async (req, res) => {
  const { ids } = req.commonParams

  const todos = ids ? ids.map((id) => ({ id })) : []

  return res.status(200).json({ ok: true, todos })
})
