import { NextloveRequest } from "../edge-helpers";
import unwrappedWithExceptionHandlingEdge, {
  WithExceptionHandlingEdgeOptions,
} from "./with-exception-handling"

export interface ExceptionHandlingEdgeOptions {
  exceptionHandlingOptions?: WithExceptionHandlingEdgeOptions
}

export const withExceptionHandlingEdge =
  ({
    exceptionHandlingOptions,
  }: ExceptionHandlingEdgeOptions = {}) =>
  (next: (req: NextloveRequest) => Promise<void>) =>
  (req: NextloveRequest) => {

    return unwrappedWithExceptionHandlingEdge(exceptionHandlingOptions)(next)(req)
  }

export * from "../http-exceptions"
