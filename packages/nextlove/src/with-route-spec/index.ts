import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "nextjs-exception-middleware"
import wrappers, { Middleware } from "nextjs-middleware-wrappers"
import { CreateWithRouteSpecFunction, RouteSpec } from "../types"
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

export const createWithRouteSpec: CreateWithRouteSpecFunction = ((
  setupParams
) => {
  const {
    authMiddlewareMap = {},
    globalMiddlewares = [],
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
    globalSchemas = {}
  } = setupParams

  const withRouteSpec = (spec: RouteSpec) => {
    const createRouteExport = (userDefinedRouteFn) => {
      const rootRequestHandler = async (
        req: NextApiRequest,
        res: NextApiResponse
      ) => {
        authMiddlewareMap["none"] = (next) => next

        const auth_middleware = authMiddlewareMap[spec.auth]
        if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

        return wrappers(
          ...((exceptionHandlingMiddleware
            ? [exceptionHandlingMiddleware]
            : []) as [any]),
          ...((globalMiddlewares || []) as []),
          auth_middleware,
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
