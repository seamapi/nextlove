import { createWithRouteSpec, Middleware, QueryArrayFormats } from "nextlove"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextlove"
import * as ZT from "lib/zod"
import withGlobalMiddlewareAfterAuth from "./with-global-middeware-after-auth"

const defaultRouteSpec = {
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateResponses: true,
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
} as const

export const withRouteSpec = createWithRouteSpec(defaultRouteSpec)

export const withRouteSpecWithGlobalMiddlewareAfterAuth = createWithRouteSpec({
  globalMiddlewaresAfterAuth: [withGlobalMiddlewareAfterAuth],
  ...defaultRouteSpec,
} as const)

export const withRouteSpecSupportedArrayFormats = (
  supportedArrayFormats: QueryArrayFormats
) =>
  createWithRouteSpec({
    ...defaultRouteSpec,
    supportedArrayFormats,
  })

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
