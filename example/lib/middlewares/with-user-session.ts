import {
  UnauthorizedException,
  Middleware,
  AuthMethodDoesNotApplyException,
} from "nextlove"

export const withUserSession: Middleware<{
  auth: {
    authorized_by: "user_session"
  }
}> = (next) => async (req, res) => {
  if (req.headers["x-user-session-token"] === undefined) {
    throw new AuthMethodDoesNotApplyException({
      type: "unauthorized",
      message: "No X-User-Session-Token header provided",
    })
  }
  if (req.headers["x-user-session-token"] !== "user_session_token") {
    throw new UnauthorizedException({
      type: "unauthorized",
      message: "Unauthorized",
    })
  }

  req.auth = {
    authorized_by: "user_session",
  }

  return next(req, res)
}

withUserSession.securitySchema = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "API Token",
}

export default withUserSession
