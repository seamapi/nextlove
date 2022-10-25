import { createWithRouteSpec, generateRouteSpec, Middleware } from "../src"
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

const withRouteSpec = createWithRouteSpec({
  authMiddlewares: {
    auth_token: authTokenMiddleware,
  },
  globalMiddlewares: [dbMiddleware],
})

export const myRouteSpec = generateRouteSpec({
  auth: "auth_token" as const,
  methods: ["GET"],
})

export const myRoute = withRouteSpec(myRouteSpec)((req, res) => {
  req.auth.authorized_by
  return res.status(200).json({ ok: true })
})
