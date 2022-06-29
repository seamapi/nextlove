import { RouteSpecHandler } from "./with-route-spec"
import { z } from "zod"

export const getWithRouteSpec = (authMiddlewares: {
  [key: string]: (next: Function) => Function
}) => {
  return new RouteSpecHandler(authMiddlewares)
}
export const commonParams = z.object({
  device_id: z.string().uuid().optional(),
  access_code_id: z.string().uuid(),
  sync: z.boolean().default(false),
})

const { withRouteSpec, generateRouteSpec } = getWithRouteSpec({
  poop: () => () => {},
})

export const route_spec = generateRouteSpec({
  methods: ["DELETE", "POST"],
  auth: 'none',
  commonParams,
})

withRouteSpec(route_spec)
