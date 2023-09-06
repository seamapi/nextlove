import { withRouteSpecEdge } from "lib/middlewares"
import { NotFoundException } from "nextlove"
import { z } from "zod"

const TODO_ID = "7e100fdd-04a5-47f8-82da-ce93266b4cac"

export const jsonBody = z.object({
  id: z.string().uuid(),
})

export const route_spec = {
  methods: ["DELETE"],
  auth: "auth_token",
  jsonBody,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
} as const

export const config = {
  runtime: "edge",
}

export default withRouteSpecEdge(route_spec)(async (req, res) => {
  const { id } = req.jsonBody
  if (id !== TODO_ID)
    throw new NotFoundException({
      type: "todo_not_found",
      message: `Todo ${id} not found`,
      data: { id },
    })

  return res.status(200).json({ ok: true })
})
