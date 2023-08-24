import { withExceptionHandling } from "../nextjs-exception-middleware"
import { Middleware, wrappers } from "../wrappers"
import {
  CreateWithRouteSpecFunction,
  QueryArrayFormats,
  RouteSpec,
} from "../types"
import {withValidation} from "./middlewares/with-validation"
import { z } from "zod"
import { NextloveRequest, getNextloveResponse } from "../edge-helpers"

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export type HTTPMethods =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "PATCH"

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
    shouldValidateResponses,
    shouldValidateGetRequestBody = true,
    exceptionHandlingMiddleware = withExceptionHandling({
      getErrorContext: (_, error: Error) => {
        if (process.env.NODE_ENV === "production") {
          return {}
        }

        return error
      },
    }) as any,
    globalSchemas = setupParams.addOkStatus
      ? {
          ok: z.boolean(),
        }
      : {},
    supportedArrayFormats = DEFAULT_ARRAY_FORMATS,
  } = setupParams

  function withRouteSpec<const T extends RouteSpec>(spec: T) {
    const createRouteExport = (userDefinedRouteFn) => {
      const rootRequestHandler = async (
        req: NextloveRequest,
      ) => {
        authMiddlewareMap["none"] = (next) => next

        const res = getNextloveResponse(req, {
          addOkStatus: setupParams.addOkStatus,
          addIf: setupParams.addIf,
        })

        req.NextResponse = res

        const auth_middleware = authMiddlewareMap[spec.auth]
        if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

        return wrappers(
          ...((exceptionHandlingMiddleware
            ? [exceptionHandlingMiddleware]
            : []) as [any]),
          ...((globalMiddlewares || []) as []),
          auth_middleware,
          ...((spec.middlewares || []) as []),
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
