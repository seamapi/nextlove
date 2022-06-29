import { NextApiResponse, NextApiRequest } from "next"
import wrappers from "nextjs-middleware-wrappers"
import { z } from "zod"
import withMethods, { HTTPMethods } from "./middlewares/with-methods"
import withValidation from "./middlewares/with-validation"

export type AuthType = string

type ParamDef = z.ZodTypeAny | z.ZodEffects<z.ZodTypeAny>

export interface RouteSpec<
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

export class RouteSpecHandler {
  private authMiddlewares: {
    [key: string]: (next: Function) => Function
  }

  constructor(authMiddlewares: {
    [key: string]: (next: Function) => Function
  }) {
    this.authMiddlewares = { none: (next) => next, ...authMiddlewares }
  }

  withRouteSpec =
    <Spec extends RouteSpec>(spec: Spec) =>
    (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
      const auth_middleware = this.authMiddlewares[spec.auth]
      if (!auth_middleware) throw new Error(`Unknown auth type: ${spec.auth}`)

      return wrappers(
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

  generateRouteSpec = <Spec extends RouteSpec>(spec: Spec) => spec
}
