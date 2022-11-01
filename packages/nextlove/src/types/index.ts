import { NextApiResponse, NextApiRequest } from "next"
import { Middleware as WrapperMiddleware } from "nextjs-middleware-wrappers"
import { z } from "zod"
import { HTTPMethods } from "../with-route-spec/middlewares/with-methods"
import { SecuritySchemeObject, SecurityRequirementObject } from "openapi3-ts"

export type Middleware<T, Dep = {}> = WrapperMiddleware<T, Dep> & {
  securitySchema?: SecuritySchemeObject
  securityObjects?: SecurityRequirementObject[]
}

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpec<
  Auth extends string = string,
  Methods extends HTTPMethods[] = any,
  JsonBody extends ParamDef = z.ZodTypeAny,
  QueryParams extends ParamDef = z.ZodTypeAny,
  CommonParams extends ParamDef = z.ZodTypeAny,
  Middlewares extends readonly Middleware<any, any>[] = any[],
  JsonResponse extends ParamDef = z.ZodObject<any, any, any, any, any>
> {
  methods: Methods
  auth: Auth
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
  middlewares?: Middlewares
  jsonResponse?: JsonResponse
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
  AuthMW extends AuthMiddlewares = AuthMiddlewares,
  GlobalMW extends Middleware<any, any>[] = any[]
> {
  authMiddlewareMap: AuthMW
  globalMiddlewares: GlobalMW
  exceptionHandlingMiddleware?: ((next: Function) => Function) | null

  // These improve OpenAPI generation
  apiName: string
  productionServerUrl: string
}

const defaultMiddlewareMap = {
  none: (next) => next,
} as const

export type RouteFunction<
  SP extends SetupParams<AuthMiddlewares>,
  RS extends RouteSpec
> = (
  req: (SP["authMiddlewareMap"] &
    typeof defaultMiddlewareMap)[RS["auth"]] extends Middleware<
    infer AuthMWOut,
    any
  >
    ? Omit<NextApiRequest, "query" | "body"> &
        AuthMWOut &
        MiddlewareChainOutput<
          RS["middlewares"] extends readonly Middleware<any, any>[]
            ? [...SP["globalMiddlewares"], ...RS["middlewares"]]
            : SP["globalMiddlewares"]
        > & {
          body: (RS["jsonBody"] extends z.ZodTypeAny
            ? z.infer<RS["jsonBody"]>
            : {}) &
            (RS["commonParams"] extends z.ZodTypeAny
              ? z.infer<RS["commonParams"]>
              : {})
          query: (RS["queryParams"] extends z.ZodTypeAny
            ? z.infer<RS["queryParams"]>
            : {}) &
            (RS["commonParams"] extends z.ZodTypeAny
              ? z.infer<RS["commonParams"]>
              : {})
        }
    : `unknown auth type: ${RS["auth"]}. You should configure this auth type in your auth_middlewares w/ createWithRouteSpec, or maybe you need to add "as const" to your route spec definition.`,
  res: NextApiResponse<
    RS["jsonResponse"] extends z.ZodTypeAny ? z.infer<RS["jsonResponse"]> : any
  >
) => Promise<void>

export type CreateWithRouteSpecFunction = <
  SP extends SetupParams<AuthMiddlewares, any>
>(
  setupParams: SP
) => <RS extends RouteSpec<any, any, any, any, any, any, any>>(
  route_spec: RS
) => (next: RouteFunction<SP, RS>) => any
