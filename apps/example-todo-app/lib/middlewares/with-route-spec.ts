import { createWithRouteSpec } from "nextlove"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextlove"
import * as ZT from "lib/zod"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateResponses: true,
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
} as const)

export const withRouteSpecWithoutValidateGetRequestBody = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateGetRequestBody: false,
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
} as const)

export const withRouteSpecWithoutValidateResponse = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
} as const)
