import { withRouteSpec, checkRouteSpec } from "lib/middlewares"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { HttpException } from "nextlove"

export const formData = z.object({
  id: z.string().uuid().optional().default(uuidv4()),
  title: z.string(),
  completed: z.boolean().optional().default(false),
})

export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  formData,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  if (!req.body.title) {
    throw new HttpException(400, {
      message: "title is required",
      type: "title_required",
    })
  }
  return res.status(200).json({ ok: true })
})
