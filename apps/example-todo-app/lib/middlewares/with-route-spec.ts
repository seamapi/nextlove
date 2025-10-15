import {
  createWithRouteSpec,
  QueryArrayFormats,
  UnauthorizedException,
} from "nextlove"
import { withAuthToken } from "./with-auth-token"
import { withUserSession } from "./with-user-session"
import * as ZT from "lib/zod"
import withGlobalMiddlewareAfterAuth from "./with-global-middeware-after-auth"

const defaultRouteSpec = {
  authMiddlewareMap: {
    auth_token: withAuthToken,
    user_session: withUserSession,
  },
  globalMiddlewares: [],
  apiName: "TODO API",
  productionServerUrl: "https://example.com",
  shouldValidateResponses: true,
  globalSchemas: {
    todo: ZT.todo,
    ok: ZT.ok,
  },
  maxDuration: 60, // Default maxDuration of 60 seconds for all routes
  onMultipleAuthMiddlewareFailures: (errors: unknown[]) => {
    throw new UnauthorizedException({
      type: "unauthorized",
      message: `Multiple auth middleware failures: ${errors.map(
        (e) => (e as Error).message
      )}`,
    })
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
