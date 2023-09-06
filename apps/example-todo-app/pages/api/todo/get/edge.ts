import { withRouteSpecEdge } from "lib/middlewares"
import { NotFoundException } from "nextlove"
import { z } from "zod"
import * as ZT from "lib/zod"

const TODO_ID = "7e100fdd-04a5-47f8-82da-ce93266b4cac"

export const queryParams = z.object({
  id: z.string().uuid(),
  throwError: z.boolean().default(true),
  throwErrorAlwaysTrue: z
    .boolean()
    .default(true)
    .refine((v) => v === true, "Must be true"),
})

export const route_spec = {
  methods: ["GET"],
  auth: "auth_token",
  queryParams,
  jsonResponse: z.object({
    ok: z.boolean(),
    todo: ZT.todo,
    error: z
      .object({
        type: z.string(),
        message: z.string(),
      })
      .optional(),
  }),
} as const

export const config = {
  runtime: "edge",
}

export default withRouteSpecEdge(route_spec)(async (req, res) => {
  const { id, throwError } = req.queryParams

  if (id !== TODO_ID) {
    if (throwError) {
      throw new NotFoundException({
        type: "todo_not_found",
        message: `Todo ${id} not found`,
        data: { id },
      })
    } else {
      return res.status(200).json({
        ok: false,
        error: { type: "todo_not_found", message: `Todo ${id} not found` },
      })
    }
  }

  return res.status(200).json({ ok: true, todo: { id } })
})
