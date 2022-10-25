import { createWithRouteSpec, Middleware, generateRouteSpec } from "../src"

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

const withRouteSpec = createWithRouteSpec({
  authMiddlewares: {
    auth_token: authTokenMiddleware,
  },
})

export const myRouteSpec = generateRouteSpec({
  auth: "auth_token" as const,
  methods: ["GET"],
})

export const myRoute = withRouteSpec(myRouteSpec)((req, res) => {
  req.auth.authorized_by
  return res.status(200).json({ ok: true })
})
