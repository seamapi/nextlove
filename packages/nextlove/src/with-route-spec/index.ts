import { withExceptionHandling } from "../nextjs-exception-middleware"
import { Middleware, wrappers } from "../wrappers"
import {
  CreateWithRouteSpecFunction,
  QueryArrayFormats,
  RouteSpec,
} from "../types"
import { withValidation } from "./middlewares/with-validation"
import { z } from "zod"
import {
  NextloveRequest,
  NextloveResponse,
  getNextloveResponse,
} from "../edge-helpers"
import { createWithRouteSpecLegacy } from "../legacy"
import { HTTPMethods, withMethods } from "../with-methods"
import { NextRequest } from "next/server"

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
      const rootRequestHandler = async (req: NextloveRequest) => {
        authMiddlewareMap["none"] = (next) => next

        const res = getNextloveResponse(req, {
          addOkStatus: setupParams.addOkStatus,
          addIf: setupParams.addIf,
        })

        req.NextResponse = res

        const auth_middleware = authMiddlewareMap[spec.auth]
        if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

        const ret = wrappers(
          ...((exceptionHandlingMiddleware
            ? [exceptionHandlingMiddleware]
            : []) as [any]),
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

        return ret
      }

      const x = rootRequestHandler

      spec.methods.forEach((method) => {
        x[method] = rootRequestHandler
        return x
      }, {})

      return x
    }

    createRouteExport._setupParams = setupParams
    createRouteExport._routeSpec = spec

    return createRouteExport
  }

  withRouteSpec._setupParams = setupParams

  return {
    withRouteSpec,
    withRouteSpecLegacy: createWithRouteSpecLegacy(setupParams),
  }
}) as any
