import { NextApiResponse, NextApiRequest } from "next"

import { MiddlewareLegacy, wrappersLegacy } from "../../wrappers"
import { withValidationLegacy } from "./middlewares/with-validation"
import { z } from "zod"
import { HTTPMethods, withMethods } from "../../with-methods"
import { CreateWithRouteSpecFunctionLegacy, RouteSpecLegacy } from "../types"
import { withExceptionHandlingLegacy } from "../nextjs-exception-middleware"
import { QueryArrayFormats } from "../../types"

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export const checkRouteSpecLegacy = <
  AuthType extends string = string,
  Methods extends HTTPMethods[] = HTTPMethods[],
  JsonBody extends ParamDef = z.ZodTypeAny,
  QueryParams extends ParamDef = z.ZodTypeAny,
  CommonParams extends ParamDef = z.ZodTypeAny,
  Middlewares extends readonly MiddlewareLegacy<
    any,
    any
  >[] = readonly MiddlewareLegacy<any, any>[],
  FormData extends ParamDef = z.ZodTypeAny,
  Spec extends RouteSpecLegacy<
    AuthType,
    Methods,
    JsonBody,
    QueryParams,
    CommonParams,
    Middlewares,
    FormData
  > = RouteSpecLegacy<
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

const DEFAULT_ARRAY_FORMATS: QueryArrayFormats = ["brackets", "comma", "repeat"]

export const createWithRouteSpecLegacy: CreateWithRouteSpecFunctionLegacy = ((
  setupParams
) => {
  const {
    authMiddlewareMap = {},
    globalMiddlewares = [],
    shouldValidateResponses,
    shouldValidateGetRequestBody = true,
    exceptionHandlingMiddleware = withExceptionHandlingLegacy({
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

  const withRouteSpec = (spec: RouteSpecLegacy) => {
    const createRouteExport = (userDefinedRouteFn) => {
      const rootRequestHandler = async (
        req: NextApiRequest,
        res: NextApiResponse
      ) => {
        authMiddlewareMap["none"] = (next) => next

        const auth_middleware = authMiddlewareMap[spec.auth]
        if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

        return wrappersLegacy(
          ...((exceptionHandlingMiddleware
            ? [exceptionHandlingMiddleware]
            : []) as [any]),
          ...((globalMiddlewares || []) as []),
          auth_middleware,
          ...((spec.middlewares || []) as []),
          withMethods(spec.methods),
          withValidationLegacy({
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
