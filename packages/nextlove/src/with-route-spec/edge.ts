import type { NextApiResponse, NextApiRequest } from "next"
import { NextRequest, NextResponse } from "next/server"
import { wrappersEdge } from "./wrappers-edge"
import { withValidationEdge } from "./middlewares/with-validation-edge"
import { NextloveRequest, getResponseEdge } from "./response-edge"
import { CreateWithRouteSpecEdgeFunction, RouteSpecEdge } from "../types/edge"
import { withExceptionHandling } from "nextjs-exception-middleware"

export const createWithRouteSpecEdge: CreateWithRouteSpecEdgeFunction = ((
  setupParams
) => {
  const {
    authMiddlewareMap = {},
    globalMiddlewares = [],
    shouldValidateResponses,
    shouldValidateGetRequestBody = true,
    // exceptionHandlingMiddleware = withExceptionHandling({
    //   addOkStatus: setupParams.addOkStatus,
    //   exceptionHandlingOptions: {
    //     getErrorContext: (req, error) => {
    //       if (process.env.NODE_ENV === "production") {
    //         return {}
    //       }

    //       return error
    //     },
    //   },
    // }) as any,
  } = setupParams

  const withRouteSpec = (spec: RouteSpecEdge) => {
    const createRouteExport = (userDefinedRouteFn: (req: NextloveRequest) => any) => {
      const rootRequestHandler = async (
        req: NextloveRequest,
      ) => {
        req.responseEdge = getResponseEdge()

        authMiddlewareMap["none"] = (next) => next;

        const auth_middleware = authMiddlewareMap[spec.auth]
        if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

        // return userDefinedRouteFn(req)
        return wrappersEdge(
          // ...((exceptionHandlingMiddleware
          //   ? [exceptionHandlingMiddleware]
          //   : []) as [any]),
          ...((globalMiddlewares || []) as []),
          auth_middleware,
          ...((spec.middlewares || []) as []),
          // withMethods(spec.methods),
          // @ts-ignore
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
        )(req)
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
