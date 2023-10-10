import { Middleware } from "nextlove"

export const withGlobalMiddlewareAfterAuth: Middleware<{
  auth: {
    authorized_by: "auth_token"
    seam: "withGlobalMiddlewareAfterAuth"
  }
}> = (next) => async (req, res) => {
  req.auth = {
    ...req.auth,
    seam: "withGlobalMiddlewareAfterAuth",
  }

  return next(req, res)
}

export default withGlobalMiddlewareAfterAuth
