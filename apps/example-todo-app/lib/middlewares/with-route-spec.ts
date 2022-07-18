import { createWithRouteSpec } from "nextjs-api"
import { withAuthToken } from "./with-auth-token"

export { generateRouteSpec } from "nextjs-api"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewares: { auth_token: withAuthToken },
  globalMiddlewares: [],
})
