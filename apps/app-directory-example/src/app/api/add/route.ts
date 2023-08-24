import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { withRouteSpec } from "@/middlewares"

export const jsonBody = z.object({
  id: z.string().uuid().optional().default(uuidv4()),
  title: z.string(),
  completed: z.boolean().optional().default(false),
})

export const route_spec = {
  methods: ["POST"],
  auth: "none",
  jsonBody,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
}

export const POST = withRouteSpec(route_spec)(async (req, res) => {
  return res.status(200).json({ ok: true })
})
