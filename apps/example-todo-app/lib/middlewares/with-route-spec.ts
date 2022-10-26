import { createWithRouteSpec } from "nextapi"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextapi"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
} as const)
