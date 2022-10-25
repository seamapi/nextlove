import { NextApiResponse, NextApiRequest } from "next"
import { withExceptionHandling } from "nextjs-exception-middleware"
import wrappers, { Middleware } from "nextjs-middleware-wrappers"
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

type AuthMiddlewares = {
  [auth_type: string]: Middleware<any, any>
}

export type RouteFunction<
  SP extends CreateRouteSpecSetupParams,
  RS extends RouteSpec
> = (
  req: NextApiRequest & { auth_type: RS["auth"] },
  res: NextApiResponse
) => Promise<void>

export interface CreateRouteSpecSetupParams {
  authMiddlewares: AuthMiddlewares
  globalMiddlewares: Array<(next: Function) => Function>
  exceptionHandlingMiddleware: ((next: Function) => Function) | null
}

export const generateRouteSpec = <T extends RouteSpec>(route_spec: T): T =>
  route_spec

/*

export default (req, res) => {

}


import { routeBuilder } from "lib/routes"

export const route_spec = routeBuilder.generateRouteSpec({
  
})

export default routeBuilder.withRouteSpec(route_spec)(async (req, res) => {
})

*/

export const createWithRouteSpec = <
  SetupParams extends CreateRouteSpecSetupParams
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
    (next: RouteFunction<SetupParams, RouteSpec>) =>
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
