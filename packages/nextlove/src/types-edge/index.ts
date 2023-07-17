import { z } from "zod"
import { SecuritySchemeObject } from "openapi3-ts"
import { NextloveRequest, NextloveResponse } from "../edge-helpers"
import { NextResponse } from "next/server"
import { Middleware } from "../wrappers"
import { MiddlewareChainOutput } from "../types"

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpecEdge<
  Auth extends string = string,
  // we don't need the withMethods middleware in Edge
  // Methods extends HTTPMethods[] = any,
  JsonBody extends ParamDef = z.ZodObject<any, any, any, any, any>,
  QueryParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  CommonParams extends ParamDef = z.ZodObject<any, any, any, any, any>,
  Middlewares extends readonly Middleware<any, any, any, any>[] = any[],
  JsonResponse extends ParamDef = z.ZodObject<any, any, any, any, any>,
  FormData extends ParamDef = z.ZodTypeAny
> {
  // we don't need the withMethods middleware in Edge
  // methods: Methods
  auth: Auth
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
  middlewares?: Middlewares
  jsonResponse?: JsonResponse
  formData?: FormData
}

export type AuthMiddlewaresEdge = {
  [auth_type: string]: Middleware<any, any, any, any>
}

export interface SetupParamsEdge<
  AuthMW extends AuthMiddlewaresEdge = AuthMiddlewaresEdge,
  GlobalMW extends Middleware<any, any, any, any>[] = any[]
> {
  authMiddlewareMap: AuthMW
  globalMiddlewares: GlobalMW
  exceptionHandlingMiddleware?: ((next: Function) => Function) | null

  // These improve OpenAPI generation
  apiName: string
  productionServerUrl: string

  addOkStatus?: boolean
  okStatusOptions?: {
    addIf?: (req: NextloveRequest) => boolean;
  }

  shouldValidateResponses?: boolean
  shouldValidateGetRequestBody?: boolean
  securitySchemas?: Record<string, SecuritySchemeObject>
}

const defaultMiddlewareMap = {
  none: (next) => next,
} as const

type Send<T> = (body: T, params?: ResponseInit) => NextResponse
type NextloveResponseWithoutJsonAndStatusMethods = Omit<
  NextloveResponse,
  "json" | "status"
>

type SuccessfulNextloveResponseMethods<T> = {
  status: (
    statusCode: 200 | 201
  ) => NextloveResponseWithoutJsonAndStatusMethods & {
    json: Send<T>
  }
  json: Send<T>
}

type ErrorNextloveResponseMethods = {
  status: (statusCode: number) => NextloveResponseWithoutJsonAndStatusMethods & {
    json: Send<any>
  }
  json: Send<any>
}

export type RouteEdgeFunction<
  SP extends SetupParamsEdge<AuthMiddlewaresEdge>,
  RS extends RouteSpecEdge
> = (
  req: (SP["authMiddlewareMap"] &
    typeof defaultMiddlewareMap)[RS["auth"]] extends Middleware<
    any,
    any,
    infer AuthMWOut,
    any
  >
    ? Omit<NextloveRequest, "responseEdge"> &
        AuthMWOut &
        MiddlewareChainOutput<
          RS["middlewares"] extends readonly Middleware<any, any, any, any>[]
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
          responseEdge: NextloveResponseWithoutJsonAndStatusMethods &
            SuccessfulNextloveResponseMethods<
              RS["jsonResponse"] extends z.ZodTypeAny
                ? z.infer<RS["jsonResponse"]>
                : any
            > &
            ErrorNextloveResponseMethods
        }
    : `unknown auth type: ${RS["auth"]}. You should configure this auth type in your auth_middlewares w/ createWithRouteSpec, or maybe you need to add "as const" to your route spec definition.`,
  res: NextloveResponse
) => NextResponse | Promise<NextResponse>

export type CreateWithRouteSpecEdgeFunction = <
  SP extends SetupParamsEdge<AuthMiddlewaresEdge, any>
>(
  setupParams: SP
) => <
  RS extends RouteSpecEdge<
    string,
    // we don't need the withMethods middleware in Edge
    // any,
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
