import {
  checkRouteSpec,
  createWithRouteSpec,
  Middleware,
  RouteSpec,
} from "../src"
import { expectTypeOf } from "expect-type"
import { z } from "zod"

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

const projSetup = {
  authMiddlewareMap: {
    auth_token: authTokenMiddleware,
  },
  globalMiddlewares: [dbMiddleware],
} as const

const withRouteSpec = createWithRouteSpec(projSetup)

export const myRoute1Spec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
  jsonBody: z.object({
    count: z.number(),
  }),
} as const)

export const myRoute1 = withRouteSpec(myRoute1Spec)(async (req, res) => {
  expectTypeOf(req.db).toMatchTypeOf<{ client: any }>()
  expectTypeOf(req.body).toMatchTypeOf<{ count: number }>()
})

export const myRoute2Spec = checkRouteSpec({
  auth: "auth_token",
  methods: ["GET"],
  queryParams: z.object({
    id: z.string(),
  }),
} as const)

export const myRoute2 = withRouteSpec(myRoute2Spec)(async (req, res) => {
  expectTypeOf(req.auth).toMatchTypeOf<{ authorized_by: "auth_token" }>()
  expectTypeOf(req.query).toMatchTypeOf<{ id: string }>()
})

export const myRoute3Spec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
  jsonBody: z.object({
    A: z.string(),
  }),
  commonParams: z.object({
    B: z.string(),
  }),
} as const)

export const myRoute3 = withRouteSpec(myRoute3Spec)(async (req, res) => {
  expectTypeOf(req.body).toMatchTypeOf<{ A: string; B: string }>()
})

// @ts-expect-error - route spec is underspecified (needs "as const")
export const myRoute4Spec: RouteSpec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
})

const withImproperMWRouteSpec = createWithRouteSpec({
  authMiddlewareMap: {
    // @ts-expect-error - improperly defined middleware
    asd: () => {},
  },
  globalMiddlewares: [],
})
