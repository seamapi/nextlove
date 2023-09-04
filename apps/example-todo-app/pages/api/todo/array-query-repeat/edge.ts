import { withRouteSpecEdgeSupportedArrayFormats } from "lib/middlewares"
import { z } from "zod"

export const queryParams = z.object({
  ids: z.array(z.string()),
})

export const route_spec = {
  methods: ["GET"],
  auth: "none",
  jsonResponse: z.object({
    ok: z.boolean(),
    ids: z.array(z.string()),
  }),
  queryParams,
} as const

export const config = {
  runtime: "edge",
}

export default withRouteSpecEdgeSupportedArrayFormats(["repeat"])(route_spec)(
  async (req, res) => {
    return res.status(200).json({ ok: true, ids: req.queryParams.ids })
  }
)
