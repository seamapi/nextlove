import { checkRouteSpec } from "nextlove"
import { withRouteSpec } from "lib/middlewares"
import { z } from "zod"
import * as ZT from "lib/zod"

export const commonParams = z
  .object({
    title: z
      .string()
      .optional()
      .refine((payload) => {
        if (!payload || payload.length < 100) {
          return true
        }
        return false
      }, "Title must be less than 100 characters"),
    ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => data.title || data.ids,
    "Either title or ids must be provided"
  )
  .refine(
    (data) => !(data.title && data.ids),
    "Must specify either title or ids"
  )

export const route_spec = checkRouteSpec({
  methods: ["GET"],
  auth: "auth_token",
  commonParams,
  jsonResponse: z.object({
    ok: z.boolean(),
    todos: z.array(ZT.todo),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  const { ids, title } = req.commonParams

  if (title) {
    return res.status(200).json({
      ok: true,
      todos: [
        {
          /**
           * this is dumb but enough to demonstrate the point 👍👍👍
           */
          id: title,
        },
      ],
    })
  }

  const todos = ids ? ids.map((id) => ({ id })) : []

  return res.status(200).json({ ok: true, todos })
})
