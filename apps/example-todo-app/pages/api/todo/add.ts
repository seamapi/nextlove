import { withRouteSpec } from "lib/middlewares"
import { checkRouteSpec } from "nextlove"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

export const jsonBody = z.object({
  id: z.string().uuid().optional().default(uuidv4()),
  title: z.string().describe(`
    ---
    title: Todo Title
    ---
    # The Title
    This is the title of the todo item.
  `),
  completed: z.boolean().optional().default(false),
  unused: z.string().optional().describe(`
    ---
    title: Unused
    deprecated: yes, because it's deprecated.
    ---
    This is an unused, deprecated field.
  `),
})

export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  jsonBody,
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  return res.status(200).json({ ok: true })
})
