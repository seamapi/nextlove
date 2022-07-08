export const withAuthToken = (next) => async (req, res) => {
  if (req.headers.authorization?.split("Bearer ")?.[1] !== "auth_token") {
    return res.status(401).end("Unauthorized")
  }

  return next(req, res)
}

export default withAuthToken
