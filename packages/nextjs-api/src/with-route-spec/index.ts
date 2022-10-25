import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "nextjs-exception-middleware"
import wrappers from "nextjs-middleware-wrappers"
import { CreateWithRouteSpecFunction, RouteSpec } from "../types"
import withMethods from "./middlewares/with-methods"
import withValidation from "./middlewares/with-validation"

export const checkRouteSpec = <Spec extends RouteSpec>(
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
    exceptionHandlingMiddleware = withExceptionHandling({
      addOkStatus: true,
    }) as any,
  } = setupParams

  return (spec) =>
    (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
      authMiddlewareMap["none"] = (next) => next

      const auth_middleware = authMiddlewareMap[spec.auth]
      if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

      return wrappers(
        ...((exceptionHandlingMiddleware
          ? [exceptionHandlingMiddleware]
          : []) as [any]),
        ...(globalMiddlewares as []),
        auth_middleware,
        withMethods(spec.methods),
        withValidation({
          jsonBody: spec.jsonBody,
          queryParams: spec.queryParams,
          commonParams: spec.commonParams,
        }),
        next
      )(req as any, res)
    }
}) as any
