import { MiddlewareChainOutput } from "../src/types"
import {
  checkRouteSpec,
  createWithRouteSpec,
  Middleware,
  RouteSpec,
} from "../src"
import { expectTypeOf } from "expect-type"
import { z } from "zod"

const authTokenMiddleware: Middleware<{
  auth: {
    authorized_by: "auth_token"
  }
}> = (next) => (req, res) => {
  req.auth = {
    authorized_by: "auth_token",
  }
  return next(req, res)
}
const bearerMiddleware: Middleware<{
  auth: {
    authorized_by: "bearer"
  }
}> = (next) => (req, res) => {
  req.auth = {
    authorized_by: "bearer",
  }
  return next(req, res)
}

const dbMiddleware: Middleware<{
  db: {
    client: any
  }
}> = (next) => (req, res) => {
  req.db = { client: "..." }
  return next(req, res)
}

const userMiddleware: Middleware<
  {
    user: {
      user_id: string
    }
  },
  {}
> = (next) => (req, res) => {
  req.user = { user_id: "..." }
  return next(req, res)
}

const chain = [dbMiddleware, bearerMiddleware] as const

const chainOutput: MiddlewareChainOutput<typeof chain> = null as any

expectTypeOf(chainOutput).toEqualTypeOf<{
  db: {
    client: any
  }
  auth: {
    authorized_by: "bearer"
  }
}>

const projSetup = {
  authMiddlewareMap: {
    auth_token: authTokenMiddleware,
    bearer: bearerMiddleware,
  },
  globalMiddlewares: [dbMiddleware],

  apiName: "test",
  productionServerUrl: "https://example.com",
} as const

const withRouteSpec = createWithRouteSpec(projSetup)

export const myRoute1Spec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
  jsonBody: z.object({
    count: z.number(),
  }),
})

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
})

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
})

export const myRoute3 = withRouteSpec(myRoute3Spec)(async (req, res) => {
  expectTypeOf(req.body).toMatchTypeOf<{ A: string }>()
  expectTypeOf(req.commonParams).toMatchTypeOf<{ B: string }>()
})

const withImproperMWRouteSpec = createWithRouteSpec({
  authMiddlewareMap: {
    // @ts-expect-error - improperly defined middleware
    asd: () => {},
  },
  globalMiddlewares: [],
})

const middlewares = [userMiddleware] as const

export const myRoute4Spec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
  middlewares,
})

export const myRoute4 = withRouteSpec(myRoute4Spec)(async (req, res) => {
  expectTypeOf(req.db).toMatchTypeOf<{ client: any }>()
  expectTypeOf(req.user).toMatchTypeOf<{ user_id: string }>()
})

export const myRoute5Spec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
  jsonResponse: z.object({
    id: z.string(),
  }),
})

export const myRoute5 = withRouteSpec(myRoute5Spec)(async (req, res) => {
  // @ts-expect-error - should be a string
  res.status(200).json({ id: 123 })

  res.status(200).json({ id: "123" })
})

export const myRoute6Spec = checkRouteSpec({
  auth: "none",
  methods: ["POST"],
  formData: z.object({
    id: z.string(),
  }),
})

export const myRoute6 = withRouteSpec(myRoute6Spec)(async (req, res) => {
  expectTypeOf(req.body).toMatchTypeOf<{ id: string }>()
})
