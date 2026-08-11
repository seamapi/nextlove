import { UnauthorizedException } from "nextlove"
import { withRouteSpec } from "lib/middlewares"

export default withRouteSpec({
  methods: ["GET"],
  auth: ["auth_token", "user_session"],
  onMultipleAuthMiddlewareFailures(errors: Error[]) {
    const unauthorizedErrors = errors.filter(
      (error) =>
        "metadata" in error &&
        typeof error.metadata === "object" &&
        "type" in error.metadata &&
        error.metadata.type === "unauthorized"
    )
    throw new UnauthorizedException({
      type: "multiple_unauthorized",
      message: `Received ${unauthorizedErrors.length} unauthorized errors`,
    })
  },
} as const)(async (req, res) => {
  return res.status(200).send(undefined)
})
