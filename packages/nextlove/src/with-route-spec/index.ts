import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "../nextjs-exception-middleware"
import wrappers, { Middleware } from "../wrappers"
import {
  CreateWithRouteSpecFunction,
  QueryArrayFormats,
  RouteSpec,
} from "../types"
import withMethods, { HTTPMethods } from "./middlewares/with-methods"
import withValidation from "./middlewares/with-validation"
import { z } from "zod"

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

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
        ).map((authType) => authMiddlewareMap[authType])
        const undefinedAuthType = authMiddlewares.find((mw) => !mw)
        if (undefinedAuthType)
          throw new Error(`Unknown auth type: ${undefinedAuthType}`)

        const firstAuthMiddlewareThatSucceeds = (next) => async (req, res) => {
          let lastError
          for (const middleware of authMiddlewares) {
            try {
              return await middleware(next)(req, res)
            } catch (e) {
              lastError = e
              continue
            }
          }

          throw lastError
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
          }),
          userDefinedRouteFn
        )(req as any, res)
      }

      rootRequestHandler._setupParams = setupParams
      rootRequestHandler._routeSpec = spec

      return rootRequestHandler
    }

    createRouteExport._setupParams = setupParams
    createRouteExport._routeSpec = spec

    return createRouteExport
  }

  withRouteSpec._setupParams = setupParams

  return withRouteSpec
}) as any
