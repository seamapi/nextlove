import { checkRouteSpec } from "nextlove"
import { withRouteSpec } from "lib/middlewares"
import { z } from "zod"
import * as ZT from "lib/zod"

export const commonParams = z.object({
  ids: z.array(z.string().uuid()),
})

export const route_spec = checkRouteSpec({
  methods: ["GET", "POST"],
  auth: "auth_token",
  commonParams,
  jsonResponse: z.object({
    ok: z.boolean(),
    todos: z.array(ZT.todo),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { ids } = req.commonParams

  return res.status(200).json({ ok: true, todos: ids.map((id) => ({ id })) })
})
