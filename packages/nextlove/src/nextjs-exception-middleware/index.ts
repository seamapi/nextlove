import { NextApiRequest, NextApiResponse } from "next"
import unwrappedWithExceptionHandling, {
  WithExceptionHandlingOptions,
} from "./with-exception-handling"
import withOkStatus, { WithOkStatusOptions } from "./with-ok-status"

export interface ExceptionHandlingOptions {
  addOkStatus?: boolean
  okStatusOptions?: WithOkStatusOptions
  exceptionHandlingOptions?: WithExceptionHandlingOptions
}

export const withExceptionHandling =
  ({
    addOkStatus = false,
    okStatusOptions,
    exceptionHandlingOptions,
  }: ExceptionHandlingOptions = {}) =>
  (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  (req: NextApiRequest, res: NextApiResponse) => {
    if (addOkStatus) {
      return withOkStatus(okStatusOptions)(
        unwrappedWithExceptionHandling(exceptionHandlingOptions)(next)
      )(req, res)
    }

    return unwrappedWithExceptionHandling(exceptionHandlingOptions)(next)(
      req,
      res
    )
  }

export * from "./http-exceptions"
