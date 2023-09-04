import { withRouteSpecEdge } from "lib/middlewares"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

export const jsonBody = z.object({
  id: z.string().uuid().optional().default(uuidv4()),
  title: z.string(),
  completed: z.boolean().optional().default(false),
})

export const route_spec = {
  methods: ["POST"],
  auth: "auth_token",
  jsonBody,
  jsonResponse: z.object({
    ok: z.string(),
  }),
} as const

export const config = {
  runtime: "edge",
}

export default withRouteSpecEdge(route_spec)(async (req, res) => {
  return res.status(200).json({
    // @ts-ignore
    ok: true,
  })
})
