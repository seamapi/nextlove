import { withRouteSpecEdge } from "@/lib/middlewares"
import {z } from "zod"
export const runtime = 'edge'

const route_spec = {
  methods: ["GET", "POST"],
  queryParams: z.object({
    foo: z.array(z.string())
  }),
  jsonBody: z.object({
    top: z.boolean()
  }),
  auth: "none"
} as const
  
export const GET = withRouteSpecEdge(route_spec)((req) => {
  console.log({
    query: req.edgeQuery,
    body: req.edgeBody
  })
  return req.responseEdge.status(203).json({ product: [2] })
})

export const POST = withRouteSpecEdge(route_spec)((req) => {
  console.log({
    query: req.edgeQuery,
    body: req.edgeBody
  })
  return req.responseEdge.status(203).json({ product: [2] })
})