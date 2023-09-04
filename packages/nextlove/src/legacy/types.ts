import { NextApiResponse, NextApiRequest } from "next"
import { MiddlewareLegacy as WrapperMiddlewareLegacy } from "../wrappers"
import { z } from "zod"
import { HTTPMethods } from "../with-methods"
import {
  SecuritySchemeObject,
  SecurityRequirementObject,
} from "openapi3-ts/oas31"
import { QueryArrayFormats } from "../types"

export type MiddlewareLegacy<T, Dep = {}> = WrapperMiddlewareLegacy<T, Dep> & {
  /**
   * @deprecated moved to setupParams
   */
  securitySchema?: SecuritySchemeObject
  securityObjects?: SecurityRequirementObject[]
}

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpecLegacy<
  Auth extends string = string,
  Methods extends HTTPMethods[] = any,
  JsonBody extends ParamDef = z.ZodObject<any, any, any, any, any>,
  QueryParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  CommonParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  Middlewares extends readonly MiddlewareLegacy<any, any>[] = any[],
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

export type MiddlewareChainOutputLegacy<
  MWChain extends readonly MiddlewareLegacy<any, any>[]
> = MWChain extends readonly []
  ? {}
  : MWChain extends readonly [infer First, ...infer Rest]
  ? First extends MiddlewareLegacy<infer T, any>
    ? T &
        (Rest extends readonly MiddlewareLegacy<any, any>[]
          ? MiddlewareChainOutputLegacy<Rest>
          : never)
    : never
  : never

export type AuthMiddlewaresLegacy = {
  [auth_type: string]: MiddlewareLegacy<any, any>
}

export interface SetupParamsLegacy<
  AuthMW extends AuthMiddlewaresLegacy = AuthMiddlewaresLegacy,
  GlobalMW extends MiddlewareLegacy<any, any>[] = any[]
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

export type RouteFunctionLegacy<
  SP extends SetupParamsLegacy<AuthMiddlewaresLegacy>,
  RS extends RouteSpecLegacy
> = (
  req: (SP["authMiddlewareMap"] &
    typeof defaultMiddlewareMap)[RS["auth"]] extends MiddlewareLegacy<
    infer AuthMWOut,
    any
  >
    ? Omit<NextApiRequest, "query" | "body"> &
        AuthMWOut &
        MiddlewareChainOutputLegacy<
          RS["middlewares"] extends readonly MiddlewareLegacy<any, any>[]
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

export type CreateWithRouteSpecFunctionLegacy = <
  SP extends SetupParamsLegacy<AuthMiddlewaresLegacy, any>
>(
  setupParams: SP
) => <
  RS extends RouteSpecLegacy<string, any, any, any, any, any, z.ZodTypeAny, any>
>(
  route_spec: RS
) => (next: RouteFunctionLegacy<SP, RS>) => any
