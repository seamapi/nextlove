import { withRouteSpec, checkRouteSpec } from "lib/middlewares"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { formData } from "./form-add"

export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  formData,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  return res.status(200).json({ ok: true })
})
