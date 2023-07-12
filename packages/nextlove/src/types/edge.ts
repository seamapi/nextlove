import { NextApiResponse } from "next"
import { MiddlewareEdge as WrapperMiddlewareEdge } from "../with-route-spec/wrappers-edge"
import { z } from "zod"
import { HTTPMethods } from "../with-route-spec/middlewares/with-methods"
import { SecuritySchemeObject, SecurityRequirementObject } from "openapi3-ts"
import { NextloveRequest } from "../with-route-spec/response-edge"
import { NextResponse } from "next/server"

export type MiddlewareEdge<T, Dep = {}> = WrapperMiddlewareEdge<T, Dep> & {
  /**
   * @deprecated moved to setupParams
   */
  securitySchema?: SecuritySchemeObject
  securityObjects?: SecurityRequirementObject[]
}

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpecEdge<
  Auth extends string = string,
  Methods extends HTTPMethods[] = any,
  JsonBody extends ParamDef = z.ZodObject<any, any, any, any, any>,
  QueryParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  CommonParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  Middlewares extends readonly MiddlewareEdge<any, any>[] = any[],
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

export type MiddlewareEdgeChainOutput<
  MWChain extends readonly MiddlewareEdge<any, any>[]
> = MWChain extends readonly []
  ? {}
  : MWChain extends readonly [infer First, ...infer Rest]
  ? First extends MiddlewareEdge<infer T, any>
    ? T &
        (Rest extends readonly MiddlewareEdge<any, any>[]
          ? MiddlewareEdgeChainOutput<Rest>
          : never)
    : never
  : never

export type AuthMiddlewaresEdge = {
  [auth_type: string]: MiddlewareEdge<any, any>
}

export interface SetupParamsEdge<
  AuthMW extends AuthMiddlewaresEdge = AuthMiddlewaresEdge,
  GlobalMW extends MiddlewareEdge<any, any>[] = any[]
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

export type RouteEdgeFunction<
  SP extends SetupParamsEdge<AuthMiddlewaresEdge>,
  RS extends RouteSpecEdge
> = (
  req: (SP["authMiddlewareMap"] &
    typeof defaultMiddlewareMap)[RS["auth"]] extends MiddlewareEdge<
    infer AuthMWOut,
    any
  >
    ? Omit<NextloveRequest, "query" | "body"> &
        AuthMWOut &
        MiddlewareEdgeChainOutput<
          RS["middlewares"] extends readonly MiddlewareEdge<any, any>[]
            ? [...SP["globalMiddlewares"], ...RS["middlewares"]]
            : SP["globalMiddlewares"]
        > & {
          edgeBody: RS["formData"] extends z.ZodTypeAny
            ? z.infer<RS["formData"]>
            : RS["jsonBody"] extends z.ZodTypeAny
            ? z.infer<RS["jsonBody"]>
            : {}
          edgeQuery: RS["queryParams"] extends z.ZodTypeAny
            ? z.infer<RS["queryParams"]>
            : {}
          commonParams: RS["commonParams"] extends z.ZodTypeAny
            ? z.infer<RS["commonParams"]>
            : {}
        }
    : `unknown auth type: ${RS["auth"]}. You should configure this auth type in your auth_middlewares w/ createWithRouteSpec, or maybe you need to add "as const" to your route spec definition.`,
  // res: NextApiResponseWithoutJsonAndStatusMethods &
  //   SuccessfulNextApiResponseMethods<
  //     RS["jsonResponse"] extends z.ZodTypeAny
  //       ? z.infer<RS["jsonResponse"]>
  //       : any
  //   > &
  //   ErrorNextApiResponseMethods
) => NextResponse | Promise<NextResponse>

export type CreateWithRouteSpecEdgeFunction = <
  SP extends SetupParamsEdge<AuthMiddlewaresEdge, any>
>(
  setupParams: SP
) => <
  RS extends RouteSpecEdge<
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
) => (next: RouteEdgeFunction<SP, RS>) => any
