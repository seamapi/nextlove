import { createWithRouteSpec } from "nextjs-api"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextjs-api"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
} as const)
