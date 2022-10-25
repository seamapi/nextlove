import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "nextjs-exception-middleware"
import wrappers, { Middleware } from "nextjs-middleware-wrappers"
import { Simplify } from "type-fest"
import { z } from "zod"
import { HTTPMethods } from "../with-route-spec/middlewares/with-methods"

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpec<
  Auth extends string = string,
  Methods extends HTTPMethods[] = any,
  JsonBody extends ParamDef = z.ZodTypeAny,
  QueryParams extends ParamDef = z.ZodTypeAny,
  CommonParams extends ParamDef = z.ZodTypeAny
> {
  methods: Methods
  auth: Auth
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
}

export type MiddlewareChainOutput<
  MWChain extends readonly Middleware<any, any>[]
> = MWChain extends readonly []
  ? {}
  : MWChain extends readonly [infer First, ...infer Rest]
  ? First extends Middleware<infer T, any>
    ? T &
        (Rest extends readonly Middleware<any, any>[]
          ? MiddlewareChainOutput<Rest>
          : never)
    : never
  : never

export type AuthMiddlewares = {
  [auth_type: string]: Middleware<any, any>
}

export interface SetupParams<
  AuthMW extends AuthMiddlewares = any,
  GlobalMW extends Middleware<any, any>[] = any
> {
  authMiddlewares: AuthMW
  globalMiddlewares: GlobalMW
  exceptionHandlingMiddleware?: ((next: Function) => Function) | null
}

export type RouteFunction<
  SP extends SetupParams<any, any>,
  RS extends RouteSpec
> = (
  req: SP["authMiddlewares"][RS["auth"]] extends Middleware<
    infer AuthMWOut,
    any
  >
    ? NextApiRequest &
        AuthMWOut &
        MiddlewareChainOutput<SP["globalMiddlewares"]>
    : `unknown auth type: ${RS["auth"]}. You should configure this auth type in your auth_middlewares w/ createWithRouteSpec`,
  res: NextApiResponse
) => Promise<void>

export type CreateWithRouteSpecFunction = <SP extends SetupParams<any, any>>(
  setup_params: SP
) => <RS extends RouteSpec>(
  route_spec: RS
) => (next: RouteFunction<SP, RS>) => any
