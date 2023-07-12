import { createWithRouteSpec, createWithRouteSpecEdge } from "nextlove"
import { withAuthToken } from "./with-auth-token"
import withAuthTokenEdge from "./with-auth-token-edge"
export { checkRouteSpec } from "nextlove"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateResponses: true,
} as const)

export const withRouteSpecEdge = createWithRouteSpecEdge({
  authMiddlewareMap: { auth_token: withAuthTokenEdge },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateResponses: true,
} as const)


export const withRouteSpecWithoutValidateGetRequestBody = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateGetRequestBody: false,
} as const)

export const withRouteSpecWithoutValidateResponse = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
} as const)
