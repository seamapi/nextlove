import {
  UnauthorizedException,
  Middleware,
  AuthMethodDoesNotApplyException,
} from "nextlove"

export const withAuthToken: Middleware<{
  auth: {
    authorized_by: "auth_token"
  }
}> = (next) => async (req, res) => {
  if (req.headers.authorization === undefined) {
    throw new AuthMethodDoesNotApplyException({
      type: "unauthorized",
      message: "No Authorization header provided",
    })
  }
  if (req.headers.authorization?.split("Bearer ")?.[1] !== "auth_token") {
    throw new UnauthorizedException({
      type: "unauthorized",
      message: "Unauthorized",
    })
  }

  req.auth = {
    authorized_by: "auth_token",
  }

  return next(req, res)
}

withAuthToken.securitySchema = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "API Token",
}

export default withAuthToken
