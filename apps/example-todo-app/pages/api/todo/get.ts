import { generateRouteSpec, withRouteSpec } from "lib/middlewares"
import { NotFoundException } from "nextjs-api"
import { TODO_ID } from "tests/fixtures"
import { z } from "zod"

export const queryParams = z.object({
  id: z.string().uuid(),
})

export const route_spec = generateRouteSpec({
  methods: ["GET"],
  auth: "auth_token",
  queryParams,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { id } = req.query as z.infer<typeof queryParams>

  if (id !== TODO_ID) {
    throw new NotFoundException({
      type: "todo_not_found",
      message: `Todo ${id} not found`,
      data: { id },
    })
  }

  return res.status(200).json({ ok: true })
})
