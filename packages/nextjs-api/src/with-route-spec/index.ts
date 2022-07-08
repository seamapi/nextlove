import { NextApiResponse, NextApiRequest } from "next"
import wrappers from "nextjs-middleware-wrappers"
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
  [key: string]: (next: Function) => Function
}

export const generateRouteSpec = <Spec extends RouteSpec>(spec: Spec) => spec

export const createWithRouteSpec = (
  {
    authMiddlewares,
    globalMiddlewares,
  }: {
    authMiddlewares: AuthMiddlewares
    globalMiddlewares: Array<(next: Function) => Function>
  } = { authMiddlewares: {}, globalMiddlewares: [] }
) => {
  return <Spec extends RouteSpec>(spec: Spec) =>
    (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
      authMiddlewares["none"] = (next) => next

      const auth_middleware = authMiddlewares[spec.auth]
      if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

      return wrappers(
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
