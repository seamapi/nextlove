import { UnauthorizedException, MiddlewareEdge } from "nextlove"

export const withAuthTokenEdge: MiddlewareEdge<{
  auth: {
    authorized_by: "auth_token"
  }
}> = (next) => async (req) => {
  const authorization = req.headers.get("authorization")

  if (authorization?.split("Bearer ")?.[1] !== "auth_token") {
    throw new UnauthorizedException({
      type: "unauthorized",
      message: "Unauthorized",
    })
  }

  req.auth = {
    authorized_by: "auth_token",
  }

  return next(req)
}

withAuthTokenEdge.securitySchema = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "API Token",
}

export default withAuthTokenEdge
