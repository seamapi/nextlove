import { NextloveRequest, NextloveResponse } from "../edge-helpers"
import unwrappedWithExceptionHandlingEdge, {
  WithExceptionHandlingEdgeOptions,
} from "./with-exception-handling"

export interface ExceptionHandlingEdgeOptions {
  exceptionHandlingOptions?: WithExceptionHandlingEdgeOptions
}

export const withExceptionHandlingEdge =
  ({ exceptionHandlingOptions }: ExceptionHandlingEdgeOptions = {}) =>
  (next: (req: NextloveRequest) => Promise<void>) =>
  (req: NextloveRequest, res: NextloveResponse) => {
    return unwrappedWithExceptionHandlingEdge(exceptionHandlingOptions)(next)(
      req,
      res
    )
  }

export * from "../http-exceptions"
