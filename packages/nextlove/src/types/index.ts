import { NextApiResponse, NextApiRequest } from "next"
import { Middleware as WrapperMiddleware } from "../wrappers"
import { z } from "zod"
import { HTTPMethods } from "../with-route-spec/middlewares/with-methods"
import {
  SecuritySchemeObject,
  SecurityRequirementObject,
} from "openapi3-ts/oas31"

export type Middleware<T, Dep = {}> = WrapperMiddleware<T, Dep> & {
  /**
   * @deprecated moved to setupParams
   */
  securitySchema?: SecuritySchemeObject
  securityObjects?: SecurityRequirementObject[]
}

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpec<
  Auth extends string = string,
  Methods extends HTTPMethods[] = any,
  JsonBody extends ParamDef = z.ZodObject<any, any, any, any, any>,
  QueryParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  CommonParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  Middlewares extends readonly Middleware<any, any>[] = any[],
  JsonResponse extends ParamDef = z.ZodObject<any, any, any, any, any>,
  FormData extends ParamDef = z.ZodTypeAny
> {
  methods: Methods
  auth: Auth
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
  middlewares?: Middlewares
  jsonResponse?: JsonResponse
  formData?: FormData
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

export type QueryArrayFormat = "brackets" | "comma" | "repeat"

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

  addOkStatus?: boolean

  shouldValidateResponses?: boolean
  shouldValidateGetRequestBody?: boolean
  securitySchemas?: Record<string, SecuritySchemeObject>
  globalSchemas?: Record<string, z.ZodTypeAny>

  supportedArrayFormats?: QueryArrayFormat[]
}

const defaultMiddlewareMap = {
  none: (next) => next,
} as const

type Send<T> = (body: T) => void
type NextApiResponseWithoutJsonAndStatusMethods = Omit<
  NextApiResponse,
  "json" | "status"
>

type SuccessfulNextApiResponseMethods<T> = {
  status: (
    statusCode: 200 | 201
  ) => NextApiResponseWithoutJsonAndStatusMethods & {
    json: Send<T>
  }
  json: Send<T>
}

type ErrorNextApiResponseMethods = {
  status: (statusCode: number) => NextApiResponseWithoutJsonAndStatusMethods & {
    json: Send<any>
  }
  json: Send<any>
}

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
          body: RS["formData"] extends z.ZodTypeAny
            ? z.infer<RS["formData"]>
            : RS["jsonBody"] extends z.ZodTypeAny
            ? z.infer<RS["jsonBody"]>
            : {}
          query: RS["queryParams"] extends z.ZodTypeAny
            ? z.infer<RS["queryParams"]>
            : {}
          commonParams: RS["commonParams"] extends z.ZodTypeAny
            ? z.infer<RS["commonParams"]>
            : {}
        }
    : `unknown auth type: ${RS["auth"]}. You should configure this auth type in your auth_middlewares w/ createWithRouteSpec, or maybe you need to add "as const" to your route spec definition.`,
  res: NextApiResponseWithoutJsonAndStatusMethods &
    SuccessfulNextApiResponseMethods<
      RS["jsonResponse"] extends z.ZodTypeAny
        ? z.infer<RS["jsonResponse"]>
        : any
    > &
    ErrorNextApiResponseMethods
) => Promise<void>

export type CreateWithRouteSpecFunction = <
  SP extends SetupParams<AuthMiddlewares, any>
>(
  setupParams: SP
) => <
  RS extends RouteSpec<
    string,
    any,
    any,
    any,
    any,
    any,
    z.ZodObject<any, any, any, any, any>,
    any
  >
>(
  route_spec: RS
) => (next: RouteFunction<SP, RS>) => any
