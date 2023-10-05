import { Middleware } from "nextlove"

export const withGlobalMiddlewareAfterAuth: Middleware<{
  __seam: "withGlobalMiddlewareAfterAuth"
}> = (next) => async (req, res) => {
  req.__seam = "withGlobalMiddlewareAfterAuth"

  return next(req, res)
}

export default withGlobalMiddlewareAfterAuth
