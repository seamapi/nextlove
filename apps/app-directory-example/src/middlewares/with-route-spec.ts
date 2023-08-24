import { createWithRouteSpec, QueryArrayFormats } from "nextlove"
import { withAuthToken } from "./with-auth-token"
export { checkRouteSpec } from "nextlove"
import * as ZT from "@/lib/zod"

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
})

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
})

export const withRouteSpecWithoutValidateResponse = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
})
