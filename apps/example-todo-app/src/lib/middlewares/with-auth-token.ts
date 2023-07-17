import { NextApiRequest, NextApiResponse } from "next"
import { UnauthorizedException, Middleware } from "nextlove"

export const withAuthToken: Middleware<
  NextApiRequest,
  NextApiResponse,
  {
    auth: {
      authorized_by: "auth_token"
    }
  }
> = (next) => async (req, res) => {
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

export default withAuthToken
