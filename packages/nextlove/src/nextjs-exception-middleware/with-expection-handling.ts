import { NextloveResponse } from "../edge-helpers"
import { HttpException } from "./http-exceptions"
import { NextRequest } from "next/server"

export type WithExceptionHandlingOptions  = {
  getErrorContext?: (
    req: NextRequest,
    error: Error
  ) => Record<string, unknown>
}

const withExceptionHandling =
  (options: WithExceptionHandlingOptions = {}) =>
  (next: (req: NextRequest, res: NextloveResponse) => Promise<void>) =>
  async (req: NextRequest, res: NextloveResponse) => {
    try {
      return await next(req, res)
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
          // REVIEW: we don't have the .end() method in 
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

export default withExceptionHandling