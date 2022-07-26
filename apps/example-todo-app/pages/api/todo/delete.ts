import { generateRouteSpec, withRouteSpec } from "lib/middlewares"
import { NotFoundException } from "nextjs-api"
import { TODO_ID } from "tests/fixtures"
import { z } from "zod"

export const jsonBody = z.object({
  id: z.string().uuid(),
})

export const route_spec = generateRouteSpec({
  methods: ["DELETE"],
  auth: "auth_token",
  jsonBody,
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { id } = req.body as z.infer<typeof jsonBody>
  if (id !== TODO_ID)
    throw new NotFoundException({
      type: "todo_not_found",
      message: `Todo ${id} not found`,
      data: { id },
    })

  return res.status(200).json({ ok: true })
})
