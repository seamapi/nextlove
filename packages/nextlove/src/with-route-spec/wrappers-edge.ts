import type { NextRequest as Req } from "next/server"
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

export type MiddlewareEdge<T, Dep = {}> = (
  next: (req: Req & Dep & T) => any
) => (req: Req & Dep & T) => any

// Safer Middleware requires the use of extendRequest to ensure that the
// new context (T) was actually added to the request. It's kind of annoying
// to use in practice, so we don't use it for our Wrappers (yet)
export type SaferMiddlewareEgde<T, Dep = {}> = (
  next: (req: Req & Dep & T) => any
) => (req: Req & Dep) => any

export const extendRequest = <T extends Req, K extends ArrayLike<unknown>>(req: T, merge: K): T & K => {
  for (const [key, v] of Object.entries(merge)) {
    ;(req as any)[key] = v
  }
  return req as any
}

type WrappersEdge1 = <Mw1RequestContext, Mw1Dep>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  endpoint: (req: Req & Mw1RequestContext) => any
) => (req: Req) => any

type WrappersEdge2 = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep
>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareEdge<Mw2RequestContext, Mw2Dep>,
  endpoint: (req: Req & Mw1RequestContext & Mw2RequestContext) => any
) => (req: Req) => any

// TODO figure out how to do a recursive definition, or one that simplifies
// these redundant WrappersEdge

type WrappersEdge3 = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext,
  Mw3Dep
>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareEdge<Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareEdge<
    Mw3RequestContext,
    Mw1RequestContext & Mw2RequestContext extends Mw3Dep ? Mw3Dep : never
  >,
  endpoint: (
    req: Req & Mw1RequestContext & Mw2RequestContext & Mw3RequestContext
  ) => any
) => (req: Req) => any

type WrappersEdge4 = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext,
  Mw3Dep,
  Mw4RequestContext,
  Mw4Dep
>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareEdge<Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareEdge<
    Mw3RequestContext,
    Mw1RequestContext & Mw2RequestContext extends Mw3Dep ? Mw3Dep : never
  >,
  mw4: MiddlewareEdge<
    Mw4RequestContext,
    Mw1RequestContext & Mw2RequestContext & Mw3RequestContext extends Mw4Dep
      ? Mw4Dep
      : never
  >,
  endpoint: (
    req: Req & Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext
  ) => any
) => (req: Req) => any

type WrappersEdge5 = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext,
  Mw3Dep,
  Mw4RequestContext,
  Mw4Dep,
  Mw5RequestContext,
  Mw5Dep
>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareEdge<Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareEdge<
    Mw3RequestContext,
    Mw1RequestContext & Mw2RequestContext extends Mw3Dep ? Mw3Dep : never
  >,
  mw4: MiddlewareEdge<
    Mw4RequestContext,
    Mw1RequestContext & Mw2RequestContext & Mw3RequestContext extends Mw4Dep
      ? Mw4Dep
      : never
  >,
  mw5: MiddlewareEdge<
    Mw5RequestContext,
    Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext extends Mw5Dep
      ? Mw5Dep
      : never
  >,
  endpoint: (
    req: Req & Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext
  ) => any
) => (req: Req) => any

type WrappersEdge6 = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext,
  Mw3Dep,
  Mw4RequestContext,
  Mw4Dep,
  Mw5RequestContext,
  Mw5Dep,
  Mw6RequestContext,
  Mw6Dep
>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareEdge<Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareEdge<
    Mw3RequestContext,
    Mw1RequestContext & Mw2RequestContext extends Mw3Dep ? Mw3Dep : never
  >,
  mw4: MiddlewareEdge<
    Mw4RequestContext,
    Mw1RequestContext & Mw2RequestContext & Mw3RequestContext extends Mw4Dep
      ? Mw4Dep
      : never
  >,
  mw5: MiddlewareEdge<
    Mw5RequestContext,
    Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext extends Mw5Dep
      ? Mw5Dep
      : never
  >,
  mw6: MiddlewareEdge<
    Mw6RequestContext,
    Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext extends Mw6Dep
      ? Mw6Dep
      : never
  >,
  endpoint: (
    req: Req & Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext &
      Mw6RequestContext
  ) => any
) => (req: Req) => any

type WrappersEdge7 = <
  Mw1RequestContext extends Mw2Dep,
  Mw1Dep,
  Mw2RequestContext,
  Mw2Dep,
  Mw3RequestContext,
  Mw3Dep,
  Mw4RequestContext,
  Mw4Dep,
  Mw5RequestContext,
  Mw5Dep,
  Mw6RequestContext,
  Mw6Dep,
  Mw7RequestContext,
  Mw7Dep
>(
  mw1: MiddlewareEdge<Mw1RequestContext, Mw1Dep>,
  mw2: MiddlewareEdge<Mw2RequestContext, Mw2Dep>,
  mw3: MiddlewareEdge<
    Mw3RequestContext,
    Mw1RequestContext & Mw2RequestContext extends Mw3Dep ? Mw3Dep : never
  >,
  mw4: MiddlewareEdge<
    Mw4RequestContext,
    Mw1RequestContext & Mw2RequestContext & Mw3RequestContext extends Mw4Dep
      ? Mw4Dep
      : never
  >,
  mw5: MiddlewareEdge<
    Mw5RequestContext,
    Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext extends Mw5Dep
      ? Mw5Dep
      : never
  >,
  mw6: MiddlewareEdge<
    Mw6RequestContext,
    Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext extends Mw6Dep
      ? Mw6Dep
      : never
  >,
  mw7: MiddlewareEdge<
    Mw7RequestContext,
    Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext &
      Mw6RequestContext extends Mw7Dep
      ? Mw7Dep
      : never
  >,
  endpoint: (
    req: Req & Mw1RequestContext &
      Mw2RequestContext &
      Mw3RequestContext &
      Mw4RequestContext &
      Mw5RequestContext &
      Mw6RequestContext &
      Mw7RequestContext
  ) => any
) => (req: Req) => any

type WrappersEdge = WrappersEdge1 &
  WrappersEdge2 &
  WrappersEdge3 &
  WrappersEdge4 &
  WrappersEdge5 &
  WrappersEdge6 &
  WrappersEdge7

export const wrappersEdge: WrappersEdge = (...wrappersArgs: any[]) => {
  const wrappedFunction = wrappersArgs[wrappersArgs.length - 1]
  const mws = wrappersArgs.slice(0, -1)

  let lastWrappedFunction = wrappedFunction
  for (let i = mws.length - 1; i >= 0; i--) {
    lastWrappedFunction = (mws[i] as any)(lastWrappedFunction)
  }

  return lastWrappedFunction
}