import { checkRouteSpec, createWithRouteSpec, Middleware } from "../src"
import { expectTypeOf } from "expect-type"

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

type AssertEqual<T, Expected> = T extends Expected
  ? Expected extends T
    ? true
    : never
  : never

const projSetup = {
  authMiddlewareMap: {
    auth_token: authTokenMiddleware,
  } as const,
  globalMiddlewares: [dbMiddleware],
} as const

const withRouteSpec = createWithRouteSpec(projSetup)

export const myRoute1Spec = checkRouteSpec({
  auth: "none",
  methods: ["GET"],
} as const)

export const myRoute1 = withRouteSpec(myRoute1Spec)(async (req, res) => {
  expectTypeOf(req.db).toMatchTypeOf<{ client: any }>()
})

export const myRoute2Spec = checkRouteSpec({
  auth: "auth_token",
  methods: ["GET"],
} as const)

export const myRoute2 = withRouteSpec(myRoute2Spec)(async (req, res) => {
  expectTypeOf(req.auth).toMatchTypeOf<{ authorized_by: "auth_token" }>()
})
