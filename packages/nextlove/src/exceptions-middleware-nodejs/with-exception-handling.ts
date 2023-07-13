import { NextApiRequest, NextApiResponse } from "next";
import { HttpException } from "../http-exceptions";

export interface WithExceptionHandlingOptions {
  getErrorContext?: (
    req: NextApiRequest,
    error: Error
  ) => Record<string, unknown>;
}

const withExceptionHandling =
  (options: WithExceptionHandlingOptions = {}) =>
  (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await next(req, res);
    } catch (error: unknown) {
      let errorContext: any = {};

      if (error instanceof Error) {
        errorContext.stack = error.stack;
      }

      errorContext = options.getErrorContext
        ? options.getErrorContext(req, errorContext)
        : errorContext;

      if (error instanceof HttpException) {
        if (error.options.json) {
          res.status(error.status).json({
            error: {
              ...error.metadata,
              ...errorContext,
            },
          });
          return;
        } else {
          res.status(error.status).end(error.metadata.message);
          return;
        }
      } else {
        const formattedError = new HttpException(500, {
          type: "internal_server_error",
          message: error instanceof Error ? error.message : "Unknown error",
        });

        res.status(500).json({
          error: {
            ...formattedError.metadata,
            ...errorContext,
          },
        });
        return;
      }
    }
  };

export default withExceptionHandling;
