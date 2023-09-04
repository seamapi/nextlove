import { checkRouteSpec, withRouteSpec } from "lib/middlewares"
import { NotFoundException } from "nextlove"
import { TODO_ID } from "tests/fixtures"
import { z } from "zod"

export const commonParams = z.object({
  id: z.string().uuid(),
})

export const route_spec = checkRouteSpec({
  methods: ["DELETE"],
  auth: "auth_token",
  commonParams,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { id } = req.commonParams
  if (id !== TODO_ID)
    throw new NotFoundException({
      type: "todo_not_found",
      message: `Todo ${id} not found`,
      data: { id },
    })

  return res.status(200).json({ ok: true })
})
