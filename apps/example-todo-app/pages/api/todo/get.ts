import { generateRouteSpec, withRouteSpec } from "lib/middlewares"
import { NotFoundException } from "nextjs-api"
import { z } from "zod"

export const queryParams = z.object({
  todo_id: z.string().uuid(),
})

export const route_spec = generateRouteSpec({
  methods: ["GET"],
  auth: "auth_token",
  queryParams,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { todo_id } = req.queryParams as z.infer<typeof queryParams>

  if (todo_id !== "todo_id") {
    throw new NotFoundException({
      type: "todo_not_found",
      message: `Todo ${todo_id} not found`,
      data: { todo_id },
    })
  }

  return res.status(200).json({ ok: true })
})
