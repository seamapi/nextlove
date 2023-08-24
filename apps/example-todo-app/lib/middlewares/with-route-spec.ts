import { createWithRouteSpecLegacy, QueryArrayFormats } from "nextlove"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextlove"
import * as ZT from "lib/zod"

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

export const withRouteSpec = createWithRouteSpecLegacy(defaultRouteSpec)

export const withRouteSpecSupportedArrayFormats = (
  supportedArrayFormats: QueryArrayFormats
) =>
  createWithRouteSpecLegacy({
    ...defaultRouteSpec,
    supportedArrayFormats,
  })

export const withRouteSpecWithoutValidateGetRequestBody =
  createWithRouteSpecLegacy({
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

export const withRouteSpecWithoutValidateResponse = createWithRouteSpecLegacy({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
} as const)
