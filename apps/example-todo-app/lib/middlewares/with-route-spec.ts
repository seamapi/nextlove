import { createWithRouteSpec } from "nextjs-api"
import { withAuthToken } from "./with-auth-token"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
})
