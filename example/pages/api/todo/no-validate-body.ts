import { checkRouteSpec } from "nextlove"
import { withRouteSpecWithoutValidateGetRequestBody } from "../../../lib/middlewares"
import { z } from "zod"

// `as const` makes deprecatedMethods a readonly tuple, so the example
// typecheck is what guards the field against regressing to a mutable array.
export const route_spec = checkRouteSpec({
  methods: ["GET", "DELETE", "POST"],
  // DELETE is ignored during OpenAPI generation, leaving GET (the semantic
  // method) and its POST alias.
  deprecatedMethods: ["DELETE"],
  auth: "auth_token",
  jsonBody: z.object({ name: z.string() }),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
} as const)

export default withRouteSpecWithoutValidateGetRequestBody(route_spec)(
  async (_, res) => {
    return res.status(200).json({ ok: true })
  }
)
