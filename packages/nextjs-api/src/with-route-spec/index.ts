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
  Spec extends RouteSpec<
    AuthType,
    Methods,
    JsonBody,
    QueryParams,
    CommonParams,
    Middlewares
  > = RouteSpec<
    AuthType,
    Methods,
    JsonBody,
    QueryParams,
    CommonParams,
    Middlewares
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
    exceptionHandlingMiddleware = withExceptionHandling({
      addOkStatus: true,
    }) as any,
  } = setupParams

  return (spec: RouteSpec) =>
    (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
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
        }),
        next
      )(req as any, res)
    }
}) as any
