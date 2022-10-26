import { createWithRouteSpec } from "nextlove"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextlove"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
} as const)
