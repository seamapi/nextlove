import { Middleware as WrapperMiddleware } from "../wrappers"
import { z } from "zod"
import {
  SecuritySchemeObject,
  SecurityRequirementObject,
} from "openapi3-ts/oas31"
import { CreateWithRouteSpecFunctionLegacy } from "../legacy"
import { NextRequest, NextResponse } from "next/server"
import { HTTPMethods } from "../with-methods"

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
  JsonResponse extends ParamDef = z.ZodTypeAny,
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
  /**
   * add x-fern-sdk-return-value to the openapi spec, useful when you want to return only a subset of the response
   */
  sdkReturnValue?: string | string[]
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

export type QueryArrayFormats = readonly QueryArrayFormat[]

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

  supportedArrayFormats?: QueryArrayFormats
}

const defaultMiddlewareMap = {
  none: (next) => next,
} as const

type Send<T> = (body: T) => Promise<NextResponse>
type NextResponseWithoutJsonAndStatusMethods = Omit<
  NextResponse,
  "json" | "status"
>

type SuccessfulNextResponseMethods<T> = {
  status: (statusCode: 200 | 201) => NextResponseWithoutJsonAndStatusMethods & {
    json: Send<T>
  }
  json: Send<T>
}

type ErrorNextResponseMethods = {
  status: (statusCode: number) => NextResponseWithoutJsonAndStatusMethods & {
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
    ? Omit<NextRequest, "query" | "body"> &
        AuthMWOut &
        MiddlewareChainOutput<
          RS["middlewares"] extends readonly Middleware<any, any>[]
            ? [...SP["globalMiddlewares"], ...RS["middlewares"]]
            : SP["globalMiddlewares"]
        > & {
          jsonBody: RS["formData"] extends z.ZodTypeAny
            ? z.infer<RS["formData"]>
            : RS["jsonBody"] extends z.ZodTypeAny
            ? z.infer<RS["jsonBody"]>
            : {}
          queryParams: RS["queryParams"] extends z.ZodTypeAny
            ? z.infer<RS["queryParams"]>
            : {}
          commonParams: RS["commonParams"] extends z.ZodTypeAny
            ? z.infer<RS["commonParams"]>
            : {}
        }
    : `unknown auth type: ${RS["auth"]}. You should configure this auth type in your auth_middlewares w/ createWithRouteSpec, or maybe you need to add "as const" to your route spec definition.`,
  res: NextResponseWithoutJsonAndStatusMethods &
    SuccessfulNextResponseMethods<
      RS["jsonResponse"] extends z.ZodTypeAny
        ? z.infer<RS["jsonResponse"]>
        : any
    > &
    ErrorNextResponseMethods
) => Promise<NextResponse>

export type CreateWithRouteSpecFunction = <
  const SP extends SetupParams<AuthMiddlewares, any>
>(
  setupParams: SP
) => {
  withRouteSpec: <
    const RS extends RouteSpec<
      string,
      any,
      any,
      any,
      any,
      any,
      z.ZodTypeAny,
      any
    >
  >(
    route_spec: RS
  ) => (next: RouteFunction<SP, RS>) => {
    [key in RS["methods"][number]]: RouteFunction<SP, RS>
  } & {
    (): RouteFunction<SP, RS>
  }
  withRouteSpecLegacy: ReturnType<CreateWithRouteSpecFunctionLegacy>
}
