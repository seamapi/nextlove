import { withRouteSpecWithoutValidateResponse } from "lib/middlewares"
import { checkRouteSpec } from "nextlove"
import { z } from "zod"

export const route_spec = checkRouteSpec({
  methods: ["GET"],
  auth: "auth_token",
  queryParams: z.object({
    list: z.array(z.string()),
  }),
  jsonResponse: z.object({
    ok: z.boolean(),
    message: z.string().optional(),
  }),
})

export default withRouteSpecWithoutValidateResponse(route_spec)(
  async (req, res) => {
    const { list } = req.query
    console.log("queries: ", req.query)

    if (list.length > 0) {
      return res.status(500).json({
        ok: false,
        message: "Expected an empty query string (?list=) to be [].",
      })
    }

    return res.status(200).json({ ok: true })
  }
)
