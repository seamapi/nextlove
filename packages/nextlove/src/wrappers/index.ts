import type { NextApiRequest, NextApiResponse } from "next"
import { NextRequest } from "next/server"
import { NextloveResponse } from "../edge-helpers"
/*

Wraps a function in layers of other functions, while preserving the input/output
type. The output of wrappers will always have the type of it's last parameter
(the wrapped function)

This function turns this type of composition...

logger.withContext("somecontext")(
  async (a, b) => {
    return a
  }
)

Into...

wrappers(
  logger.withContext("somecontext"),
  async (a, b) => {
    return a
  }
)

Having this as a utility method helps preserve types, which otherwise can get
messed up by the middlewares. It also can make the code cleaner where there are
multiple wrappers.

## EXAMPLES

In the context of request middleware you might write something like this...

const withRequestLoggingMiddleware = (next) => async (req, res) => {
  console.log(`GOT REQUEST ${req.method} ${req.path}`)
  return next(req, res)
}

Here's an example of a wrapper that takes some parameters...

const withLoggedArguments =
    (logPrefix: string) =>
    (next) =>
    async (...funcArgs) => {
      console.log(logPrefix, ...funcArgs)
      return next(...funcArgs)
    }

*/

export type MiddlewareBase<ReqT, ResT, T, Dep = {}> = (
  next: (req: ReqT & Dep & T, res: ResT) => any
) => (req: ReqT & Dep & T, res: ResT) => any

export type MiddlewareLegacy<T, Dep = {}> = MiddlewareBase<
  NextApiRequest,
  NextApiResponse,
  T,
  Dep
>
export type Middleware<T, Dep = {}> = MiddlewareBase<
  NextRequest,
  NextloveResponse,
  T,
  Dep
>

// Safer Middleware requires the use of extendRequest to ensure that the
// new context (T) was actually added to the request. It's kind of annoying
// to use in practice, so we don't use it for our Wrappers (yet)
export type SaferMiddlewareBase<ReqT, ResT, T, Dep = {}> = (
  next: (req: ReqT & Dep & T, res: ResT) => any
) => (req: ReqT & Dep, res: ResT) => any
export type SaferMiddlewareLegacy<T, Dep = {}> = SaferMiddlewareBase<
  NextApiRequest,
  NextApiResponse,
  T,
  Dep
>
export type SaferMiddleware<T, Dep = {}> = SaferMiddlewareBase<
  NextRequest,
  NextloveResponse,
  T,
  Dep
>

export const extendRequestFactory =
  <ReqT>() =>
  <K extends ArrayLike<unknown>>(req: ReqT, merge: K): ReqT & K => {
    for (const [key, v] of Object.entries(merge)) {
      ;(req as any)[key] = v
    }
    return req as any
  }

export const extendRequestLegacy = extendRequestFactory<NextApiRequest>()
export const extendRequest = extendRequestFactory<NextRequest>()

type Wrappers1Base<ReqT, ResT> = <Mw1RequestContext, Mw1Dep>(
  mw1: Middleware<Mw1RequestContext, Mw1Dep>,
  endpoint: (req: ReqT & Mw1RequestContext, res: ResT) => any
) => (req: ReqT, res: ResT) => any

type Wrappers1Legacy = Wrappers1Base<NextApiRequest, NextApiResponse>
type Wrappers1 = Wrappers1Base<NextRequest, NextloveResponse>

type Wrappers2Base<ReqT, ResT> = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep
>(
  mw1: MiddlewareBase<ReqT, ResT, Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareBase<ReqT, ResT, Mw2RequestContext, Mw2Dep>,
  endpoint: (
    req: ReqT & Mw1RequestContext & Mw2RequestContext,
    res: ResT
  ) => any
) => (req: ReqT, res: ResT) => any

type Wrappers2Legacy = Wrappers2Base<NextApiRequest, NextApiResponse>
type Wrappers2 = Wrappers2Base<NextRequest, NextloveResponse>

// TODO figure out how to do a recursive definition, or one that simplifies these redundant wrappers

type Wrappers3Base<ReqT, ResT> = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext,
  Mw3Dep
>(
  mw1: MiddlewareBase<ReqT, ResT, Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareBase<ReqT, ResT, Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareBase<
    ReqT,
    ResT,
    Mw3RequestContext,
    Mw1RequestContext & Mw2RequestContext extends Mw3Dep ? Mw3Dep : never
  >,
  endpoint: (
    req: ReqT & Mw1RequestContext & Mw2RequestContext & Mw3RequestContext,
    res: ResT
  ) => any
) => (req: ReqT, res: ResT) => any

type Wrappers3Legacy = Wrappers3Base<NextApiRequest, NextApiResponse>
type Wrappers3 = Wrappers3Base<NextRequest, NextloveResponse>

type Wrappers4Base<ReqT, ResT> = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext extends Mw4Dep,
  Mw3Dep,
  Mw4RequestContext,
  Mw4Dep
>(
  mw1: MiddlewareBase<ReqT, ResT, Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareBase<ReqT, ResT, Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareBase<ReqT, ResT, Mw3RequestContext, Mw3Dep>,
  mw4: MiddlewareBase<ReqT, ResT, Mw4RequestContext, Mw4Dep>,
  endpoint: (
    req: ReqT &
      Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext,
    res: ResT
  ) => any
) => (req: ReqT, res: ResT) => any

type Wrappers4Legacy = Wrappers4Base<NextApiRequest, NextApiResponse>
type Wrappers4 = Wrappers4Base<NextRequest, NextloveResponse>
type Wrappers5Base<ReqT, ResT> = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext extends Mw4Dep,
  Mw3Dep,
  Mw4RequestContext extends Mw5Dep,
  Mw4Dep,
  Mw5RequestContext,
  Mw5Dep
>(
  mw1: MiddlewareBase<ReqT, ResT, Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareBase<ReqT, ResT, Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareBase<ReqT, ResT, Mw3RequestContext, Mw3Dep>,
  mw4: MiddlewareBase<ReqT, ResT, Mw4RequestContext, Mw4Dep>,
  mw5: MiddlewareBase<ReqT, ResT, Mw5RequestContext, Mw5Dep>,
  endpoint: (
    req: ReqT &
      Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext,
    res: ResT
  ) => any
) => (req: ReqT, res: ResT) => any

type Wrappers5Legacy = Wrappers5Base<NextApiRequest, NextApiResponse>
type Wrappers5 = Wrappers5Base<NextRequest, NextloveResponse>

type Wrappers6Base<ReqT, ResT> = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext extends Mw4Dep,
  Mw3Dep,
  Mw4RequestContext extends Mw5Dep,
  Mw4Dep,
  Mw5RequestContext extends Mw6Dep,
  Mw5Dep,
  Mw6RequestContext,
  Mw6Dep
>(
  mw1: MiddlewareBase<ReqT, ResT, Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareBase<ReqT, ResT, Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareBase<ReqT, ResT, Mw3RequestContext, Mw3Dep>,
  mw4: MiddlewareBase<ReqT, ResT, Mw4RequestContext, Mw4Dep>,
  mw5: MiddlewareBase<ReqT, ResT, Mw5RequestContext, Mw5Dep>,
  mw6: MiddlewareBase<ReqT, ResT, Mw6RequestContext, Mw6Dep>,
  endpoint: (
    req: ReqT &
      Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext &
      Mw6RequestContext,
    res: ResT
  ) => any
) => (req: ReqT, res: ResT) => any

type Wrappers6Legacy = Wrappers6Base<NextApiRequest, NextApiResponse>
type Wrappers6 = Wrappers6Base<NextRequest, NextloveResponse>

type Wrappers7Base<ReqT, ResT> = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext extends Mw4Dep,
  Mw3Dep,
  Mw4RequestContext extends Mw5Dep,
  Mw4Dep,
  Mw5RequestContext extends Mw6Dep,
  Mw5Dep,
  Mw6RequestContext extends Mw7Dep,
  Mw6Dep,
  Mw7RequestContext,
  Mw7Dep
>(
  mw1: MiddlewareBase<ReqT, ResT, Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareBase<ReqT, ResT, Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareBase<ReqT, ResT, Mw3RequestContext, Mw3Dep>,
  mw4: MiddlewareBase<ReqT, ResT, Mw4RequestContext, Mw4Dep>,
  mw5: MiddlewareBase<ReqT, ResT, Mw5RequestContext, Mw5Dep>,
  mw6: MiddlewareBase<ReqT, ResT, Mw6RequestContext, Mw6Dep>,
  mw7: MiddlewareBase<ReqT, ResT, Mw7RequestContext, Mw7Dep>,
  endpoint: (
    req: ReqT &
      Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext &
      Mw6RequestContext &
      Mw7RequestContext,
    res: ResT
  ) => any
) => (req: ReqT, res: ResT) => any

type Wrappers7Legacy = Wrappers7Base<NextApiRequest, NextApiResponse>
type Wrappers7 = Wrappers7Base<NextRequest, NextloveResponse>

type WrappersLegacy = Wrappers1Legacy &
  Wrappers2Legacy &
  Wrappers3Legacy &
  Wrappers4Legacy &
  Wrappers5Legacy &
  Wrappers6Legacy &
  Wrappers7Legacy

type Wrappers = Wrappers1 &
  Wrappers2 &
  Wrappers3 &
  Wrappers4 &
  Wrappers5 &
  Wrappers6 &
  Wrappers7

export const wrappersLegacy: WrappersLegacy = (...wrappersArgs: any[]) => {
  const wrappedFunction = wrappersArgs[wrappersArgs.length - 1]
  const mws = wrappersArgs.slice(0, -1)

  let lastWrappedFunction = wrappedFunction
  for (let i = mws.length - 1; i >= 0; i--) {
    lastWrappedFunction = (mws[i] as any)(lastWrappedFunction)
  }

  return lastWrappedFunction
}

export const wrappers: Wrappers = (...wrappersArgs: any[]) => {
  const wrappedFunction = wrappersArgs[wrappersArgs.length - 1]
  const mws = wrappersArgs.slice(0, -1)

  let lastWrappedFunction = wrappedFunction
  for (let i = mws.length - 1; i >= 0; i--) {
    lastWrappedFunction = (mws[i] as any)(lastWrappedFunction)
  }

  return lastWrappedFunction
}
