import { UnauthorizedException } from "nextjs-api"

export const withAuthToken = (next) => async (req, res) => {
  if (req.headers.authorization?.split("Bearer ")?.[1] !== "auth_token") {
    throw new UnauthorizedException({
      type: "unauthorized",
      message: "Unauthorized",
    })
  }

  return next(req, res)
}

export default withAuthToken
