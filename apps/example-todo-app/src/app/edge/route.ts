import { withRouteSpecEdge } from "@/lib/middlewares"
import { z } from "zod"

export const runtime = "edge"

const route_spec = {
  jsonResponse: z.object({
    return: z.boolean(),
  }),
  auth: "none",
} as const

export const GET = withRouteSpecEdge(route_spec)((req, res) => {
  return res.status(200).json({ return: true })
})
