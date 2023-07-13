import { NextloveRequest } from "../edge-helpers"
import { HttpException } from "../http-exceptions"

export interface WithExceptionHandlingEdgeOptions {
  getErrorContext?: (
    req: NextloveRequest,
    error: Error
  ) => Record<string, unknown>
}

const withExceptionHandlingEdge =
  (options: WithExceptionHandlingEdgeOptions = {}) =>
  (next: (req: NextloveRequest) => Promise<void>) =>
  async (req: NextloveRequest) => {
    const res = req.responseEdge
    try {
      return await next(req)
    } catch (error: unknown) {
      let errorContext: any = {}

      if (error instanceof Error) {
        errorContext.stack = error.stack
      }

      errorContext = options.getErrorContext
        ? options.getErrorContext(req, errorContext)
        : errorContext

      if (error instanceof HttpException) {
        if (error.options.json) {
          return res.status(error.status).json({
            error: {
              ...error.metadata,
              ...errorContext,
            },
          })
        } else {
          // REVIEW: we don't have the .end() method in Edge
          return res
            .status(error.status)
            .json({ error: { message: error.metadata.message } })
        }
      } else {
        const formattedError = new HttpException(500, {
          type: "internal_server_error",
          message: error instanceof Error ? error.message : "Unknown error",
        })

        return res.status(500).json({
          error: {
            ...formattedError.metadata,
            ...errorContext,
          },
        })
      }
    }
  }

export default withExceptionHandlingEdge
