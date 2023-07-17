import { UnauthorizedException, Middleware } from "nextlove"
import { NextloveRequest, NextloveResponse } from "nextlove/dist/edge-helpers"

export const withAuthTokenEdge: Middleware<
  NextloveRequest,
  NextloveResponse,
  {
    auth: {
      authorized_by: "auth_token"
    }
  }
> = (next) => async (req, res) => {
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

  return next(req, res)
}

export default withAuthTokenEdge
