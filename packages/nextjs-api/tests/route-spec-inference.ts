import {
  RouteFunction2,
  SetupParams,
  RouteSpec,
  checkRouteSpec,
} from "./../src/with-route-spec/index"
import { createWithRouteSpec, Middleware } from "../src"
import type { NextApiRequest as Req, NextApiResponse as Res } from "next"
import tb, { Union } from "ts-toolbelt"
import { ObjectOf } from "ts-toolbelt/out/List/ObjectOf"
import { Simplify } from "type-fest"

// export type Middleware<T, Dep = {}> = (
//   next: (req: Req & Dep & T, res: Res) => any
// ) => (req: Req & Dep & T, res: Res) => any

// export type MiddlewareOutput<MW extends Middleware<any, any>> =
//   MW extends Middleware<infer T, any> ? T : never

// // export type MiddlewareChainOutput<MWChain extends Middleware<any, any>[]> =
// //   MWChain extends [infer Head, ...infer Tail]
// //     ? Head extends Middleware<infer T, any>
// //       ? Tail extends Middleware<any, any>[]
// //         ? T & MiddlewareChainOutput<Tail>
// //         : T
// //       : never
// //     : {}

// type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
//   k: infer I
// ) => void
//   ? I
//   : never

// type HasTail<T extends any[]> = T extends readonly [] | readonly [any]
//   ? false
//   : true
// type Tail<Args> = Args extends readonly [any?, ...infer Rest] ? Rest : Args
// type Head<Args> = Args extends readonly [infer Head, ...any[]] ? Head : never

// const ar = [1, 2, 3] as const
// type A = Tail<typeof ar>
// type B = Head<typeof ar>

// type MiddlewareChainOutput<MWChain extends readonly Middleware<any, any>[]> =
//   Simplify<
//     MWChain extends readonly []
//       ? {}
//       : MWChain extends readonly [infer First, ...infer Rest]
//       ? First extends Middleware<infer T, any>
//         ? T &
//             (Rest extends readonly Middleware<any, any>[]
//               ? MiddlewareChainOutput<Rest>
//               : never)
//         : never
//       : never
//   >

// // HasTail<MWChain> ?
// //   MiddlewareOutputs<Tail<MWChain>>,
// //   : {}

// // tb.List.ObjectOf<MWChain>

const exampleAuthMw: Middleware<{ auth: { authorized_by: "bearer" } }, {}> =
  (next) => (req, res) => {}

const authTokenMiddleware: Middleware<
  {
    auth: {
      authorized_by: "auth_token"
    }
  },
  {}
> = (next) => (req, res) => {
  req.auth = {
    authorized_by: "auth_token",
  }
  return next(req, res)
}

const dbMiddleware: Middleware<
  {
    db: {
      client: any
    }
  },
  {}
> = (next) => (req, res) => {
  req.db = {
    client: "...",
  }
  return next(req, res)
}

// const chain = [dbMiddleware, authTokenMiddleware] as const
// type ChainOutput = MiddlewareChainOutput<typeof chain>

const projSetup = {
  authMiddlewares: {
    auth_token: authTokenMiddleware,
    bearer: exampleAuthMw,
  } as const,
  globalMiddlewares: [dbMiddleware],
} as const

const withRouteSpec = createWithRouteSpec(projSetup)

export const myRouteSpec = checkRouteSpec({
  auth: "bearer" as const,
  methods: ["GET"],
} as const)

const withRoute2 = createWithRouteSpec(projSetup)(myRouteSpec)

// export const myRoute = withRouteSpec(myRouteSpec)((req, res) => {
export const myRoute = withRoute2(async (req, res) => {
  // req.auth.authorized_by
  // return res.status(200).json({ ok: true })
})

// interface RouteSpec<AuthType> {
//   auth: AuthType
// }

// interface SetupParams<AuthMWs extends Middleware<any, any>> {
//   authMiddlewares: AuthMWs
// }

const setup_params = {
  authMiddlewares: {
    bearer: exampleAuthMw,
  } as const,
  globalMiddlewares: [] as const,
  exceptionHandlingMiddleware: null,
} as const

type OutputOfAuthMiddleware1<
  AuthType extends keyof typeof setup_params["authMiddlewares"]
> = typeof setup_params["authMiddlewares"][AuthType] extends Middleware<
  infer Out,
  any
>
  ? Out
  : never

type A = OutputOfAuthMiddleware1<"bearer">

type OutputOfAuthMiddleware2<
  SP extends SetupParams<any>,
  AuthType extends keyof typeof setup_params["authMiddlewares"]
> = SP["authMiddlewares"][AuthType] extends Middleware<infer Out, any>
  ? Out
  : never

type B = OutputOfAuthMiddleware2<typeof setup_params, "bearer">

type OutputOfAuthMiddleware3<
  SP extends SetupParams<any>,
  RS extends RouteSpec
> = SP["authMiddlewares"][RS["auth"]] extends Middleware<infer Out, any>
  ? Out
  : never

const routespec = {
  auth: "bearer" as const,
  methods: ["GET"],
} as const

type C = OutputOfAuthMiddleware3<typeof setup_params, typeof routespec>

type D = RouteFunction2<typeof setup_params, typeof routespec>

const withRoute = createWithRouteSpec(setup_params)(routespec)

type E = typeof withRoute

withRoute(async (req, res) => {})

// type C = RouteFunction2<typeof setup_params,
