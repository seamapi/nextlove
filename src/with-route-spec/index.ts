import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "../nextjs-exception-middleware/index.js"
import wrappers, { Middleware } from "../wrappers/index.js"
import {
  CreateWithRouteSpecFunction,
  QueryArrayFormats,
  RouteSpec,
} from "../types/index.js"
import withMethods, { HTTPMethods } from "./middlewares/with-methods.js"
import withValidation from "./middlewares/with-validation.js"
import { z } from "zod"
import {
  AuthMethodDoesNotApplyException,
  UnauthorizedException,
} from "../nextjs-exception-middleware/index.js"

// ParamDef type compatible with both Zod 3 and Zod 4
type ParamDef = z.ZodTypeAny

export const checkRouteSpec = <
  AuthType extends string = string,
  Methods extends HTTPMethods[] = HTTPMethods[],
  JsonBody extends ParamDef = z.ZodTypeAny,
  QueryParams extends ParamDef = z.ZodTypeAny,
  CommonParams extends ParamDef = z.ZodTypeAny,
  Middlewares extends readonly Middleware<any, any>[] = readonly Middleware<
    any,
    any
  >[],
  FormData extends ParamDef = z.ZodTypeAny,
  Spec extends RouteSpec<
    AuthType,
    Methods,
    JsonBody,
    QueryParams,
    CommonParams,
    Middlewares,
    FormData
  > = RouteSpec<
    AuthType,
    Methods,
    JsonBody,
    QueryParams,
    CommonParams,
    Middlewares,
    FormData
  >
>(
  spec: Spec
): string extends Spec["auth"]
  ? `your route spec is underspecified, add "as const"`
  : Spec => spec as any

export const DEFAULT_ARRAY_FORMATS: QueryArrayFormats = [
  "brackets",
  "comma",
  "repeat",
]

export const createWithRouteSpec: CreateWithRouteSpecFunction = ((
  setupParams
) => {
  const {
    authMiddlewareMap = {},
    globalMiddlewares = [],
    globalMiddlewaresAfterAuth = [],
    shouldValidateResponses,
    shouldValidateGetRequestBody = true,
    exceptionHandlingMiddleware = withExceptionHandling({
      addOkStatus: setupParams.addOkStatus,
      exceptionHandlingOptions: {
        getErrorContext: (req, error) => {
          if (process.env.NODE_ENV === "production") {
            return {}
          }

          return error
        },
      },
    }) as any,
    globalSchemas = setupParams.addOkStatus
      ? {
          ok: z.boolean(),
        }
      : {},
    supportedArrayFormats = DEFAULT_ARRAY_FORMATS,
    useLegacyQueryParamsParser = true,
    strictQueryParamsParser,
    onMultipleAuthMiddlewareFailures,
    maxDuration: globalMaxDuration,
  } = setupParams

  const withRouteSpec = (spec: RouteSpec) => {
    const createRouteExport = (userDefinedRouteFn) => {
      const rootRequestHandler = async (
        req: NextApiRequest,
        res: NextApiResponse
      ) => {
        authMiddlewareMap["none"] = (next) => next

        const authMiddlewares = (
          Array.isArray(spec.auth) ? spec.auth : [spec.auth]
        ).map((authType) => [authType, authMiddlewareMap[authType]] as const)
        const undefinedAuthType = authMiddlewares.find(([, mw]) => !mw)
        if (undefinedAuthType)
          throw new Error(`Unknown auth type: ${undefinedAuthType}`)

        const firstAuthMiddlewareThatSucceeds = (next) => async (req, res) => {
          const handleMultipleAuthMiddlewareFailures =
            spec.onMultipleAuthMiddlewareFailures ??
            onMultipleAuthMiddlewareFailures

          for (const [name, middleware] of authMiddlewares) {
            let didAuthMiddlewareThrow = true
            try {
              return await middleware((...args) => {
                // Otherwise errors unrelated to auth thrown by built-in middleware (withMethods, withValidation) will be caught here
                didAuthMiddlewareThrow = false
                return next(...args)
              })(req, res)
            } catch (error: any) {
              if (error instanceof AuthMethodDoesNotApplyException) {
                continue
              }
              error.source_middleware = name
              if (
                handleMultipleAuthMiddlewareFailures &&
                didAuthMiddlewareThrow
              ) {
                handleMultipleAuthMiddlewareFailures([error])
              }
              throw error
            }
          }
          throw new UnauthorizedException({
            type: "unauthorized",
            message: "No authentication methods succeeded",
          })
        }

        return wrappers(
          ...((exceptionHandlingMiddleware
            ? [exceptionHandlingMiddleware]
            : []) as [any]),
          ...((globalMiddlewares || []) as []),
          firstAuthMiddlewareThatSucceeds,
          ...((globalMiddlewaresAfterAuth || []) as []),
          ...((spec.middlewares || []) as []),
          withMethods(spec.methods),
          withValidation({
            jsonBody: spec.jsonBody,
            queryParams: spec.queryParams,
            commonParams: spec.commonParams,
            formData: spec.formData,
            jsonResponse: spec.jsonResponse,
            shouldValidateResponses,
            shouldValidateGetRequestBody,
            supportedArrayFormats,
            useLegacyQueryParamsParser:
              spec.useLegacyQueryParamsParser ?? useLegacyQueryParamsParser,
            strictQueryParamsParser:
              spec.strictQueryParamsParser ?? strictQueryParamsParser,
          }),
          userDefinedRouteFn
        )(req as any, res)
      }

      rootRequestHandler._setupParams = setupParams
      rootRequestHandler._routeSpec = spec

      // Export maxDuration as a Next.js route segment config
      const maxDuration = spec.maxDuration ?? globalMaxDuration
      if (maxDuration !== undefined) {
        rootRequestHandler.maxDuration = maxDuration
      }

      return rootRequestHandler
    }

    createRouteExport._setupParams = setupParams
    createRouteExport._routeSpec = spec

    return createRouteExport
  }

  withRouteSpec._setupParams = setupParams

  return withRouteSpec
}) as any
