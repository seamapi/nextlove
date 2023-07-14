import { wrappersEdge } from "../wrappers-edge"
import { withValidationEdge } from "./with-validation-edge"
import { NextloveRequest, NextloveResponse, getResponse } from "../edge-helpers"
import { CreateWithRouteSpecEdgeFunction, RouteSpecEdge } from "../types-edge"
import { withExceptionHandlingEdge } from "../exceptions-middleware-egde"

export const createWithRouteSpecEdge: CreateWithRouteSpecEdgeFunction = ((
  setupParams
) => {
  const {
    authMiddlewareMap = {},
    globalMiddlewares = [],
    shouldValidateResponses,
    shouldValidateGetRequestBody = true,
    exceptionHandlingMiddleware = withExceptionHandlingEdge({
      exceptionHandlingOptions: {
        getErrorContext: (req, error) => {
          if (process.env.NODE_ENV === "production") {
            return {}
          }

          return error
        },
      },
    }) as any,
  } = setupParams

  const withRouteSpec = (spec: RouteSpecEdge) => {
    const createRouteExport = (userDefinedRouteFn: (req: NextloveRequest, res: NextloveResponse) => any) => {
      const rootRequestHandler = async (
        req: NextloveRequest,
      ) => {
        req.responseEdge = getResponse(req, {
          addIf: setupParams.okStatusOptions?.addIf,
          addOkStatus: setupParams.addOkStatus,
        })

        const res = req.responseEdge

        authMiddlewareMap["none"] = (next) => next;

        const auth_middleware = authMiddlewareMap[spec.auth]
        if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

        return wrappersEdge<
          NextloveRequest,
          NextloveResponse,
          NextloveRequest,
          NextloveRequest,
          NextloveRequest,
          NextloveRequest,
          NextloveRequest,
          NextloveRequest
         >(
          ...((exceptionHandlingMiddleware
            ? [exceptionHandlingMiddleware]
            : []) as [any]),
          ...((globalMiddlewares || []) as []),
          auth_middleware,
          ...((spec.middlewares || []) as []),
          // we don't need the withMethods middleware in Edge
          // withMethods(spec.methods),
          withValidationEdge({
            jsonBody: spec.jsonBody,
            queryParams: spec.queryParams,
            commonParams: spec.commonParams,
            formData: spec.formData,
            jsonResponse: spec.jsonResponse,
            shouldValidateResponses,
            shouldValidateGetRequestBody,
          }),
          userDefinedRouteFn
        )(req, res)
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
