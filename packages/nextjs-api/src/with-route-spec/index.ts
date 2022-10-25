import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "nextjs-exception-middleware"
import wrappers, { Middleware } from "nextjs-middleware-wrappers"
import { Simplify } from "type-fest"
import { z } from "zod"
import withMethods, { HTTPMethods } from "./middlewares/with-methods"
import withValidation from "./middlewares/with-validation"

type AuthType = "none" | string

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

interface RouteSpec<
  Auth extends AuthType = AuthType,
  JsonBody extends ParamDef = z.ZodTypeAny,
  QueryParams extends ParamDef = z.ZodTypeAny,
  CommonParams extends ParamDef = z.ZodTypeAny
> {
  methods: HTTPMethods[]
  auth: Auth
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
}

type MiddlewareChainOutput<MWChain extends readonly Middleware<any, any>[]> =
  Simplify<
    MWChain extends readonly []
      ? {}
      : MWChain extends readonly [infer First, ...infer Rest]
      ? First extends Middleware<infer T, any>
        ? T &
            (Rest extends readonly Middleware<any, any>[]
              ? MiddlewareChainOutput<Rest>
              : never)
        : never
      : never
  >

type AuthMiddlewares = {
  [auth_type: string]: Middleware<any, any>
}

export type RouteFunction<
  SP extends CreateRouteSpecSetupParams<any, any>,
  RS extends RouteSpec,
  AK extends keyof SP["authMiddlewares"]
> = SP extends CreateRouteSpecSetupParams<infer AuthMW, infer GlobalMW>
  ? (
      req: NextApiRequest & { globalMwOut: MiddlewareChainOutput<GlobalMW> } & {
        authMwOut: AuthMW[AK] extends Middleware<infer AuthOut, any>
          ? AuthOut
          : "boop"
      },
      res: NextApiResponse
    ) => void
  : "beep" // (req: NextApiRequest, res: NextApiResponse) => Promise<void>

export interface CreateRouteSpecSetupParams<
  AuthMW extends AuthMiddlewares,
  GlobalMW extends Middleware<any, any>[]
> {
  authMiddlewares: AuthMW
  globalMiddlewares: GlobalMW
  exceptionHandlingMiddleware: ((next: Function) => Function) | null
}

export const generateRouteSpec = <T extends RouteSpec>(route_spec: T): T =>
  route_spec

export const createWithRouteSpec = <
  SetupParams extends CreateRouteSpecSetupParams<any, any>
>(
  setup_params: Partial<SetupParams>
) => {
  const {
    authMiddlewares = {},
    globalMiddlewares = [],
    exceptionHandlingMiddleware = withExceptionHandling({
      addOkStatus: true,
    }) as any,
  } = setup_params

  return <RS extends RouteSpec>(spec: RS) =>
    (
      next: RS extends RouteSpec<infer AuthKey>
        ? RouteFunction<SetupParams, RouteSpec, AuthKey>
        : never
    ) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
      authMiddlewares["none"] = (next) => next

      const auth_middleware = authMiddlewares[spec.auth]
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
}
