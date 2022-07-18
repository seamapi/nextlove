import { generateRouteSpec, withRouteSpec } from "lib/middlewares"
import { BadRequestException } from "nextjs-api"
import { z } from "zod"

export const jsonBody = z.object({
  todo_id: z.string().uuid(),
})

export const route_spec = generateRouteSpec({
  methods: ["DELETE"],
  auth: "auth_token",
  jsonBody,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { todo_id } = req.body as z.infer<typeof jsonBody>
  if (todo_id !== "todo_id")
    throw new BadRequestException({
      type: "invalid_todo_id",
      message: "Invalid 'todo_id'",
      data: { todo_id },
    })

  return res.status(200).json({ ok: true })
})
