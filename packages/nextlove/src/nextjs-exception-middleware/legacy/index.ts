import { NextApiRequest, NextApiResponse } from "next"
import {
  withLegacyExceptionHandling as unwrappedWithLegacyExceptionHandling,
  WithLegacyExceptionHandlingOptions,
} from "./with-legacy-exception-handling"
import { withLegacyOkStatus, WithLegacyOkStatusOptions } from "./with-legacy-ok-status"

export interface ExceptionHandlingOptions {
  addOkStatus?: boolean
  okStatusOptions?: WithLegacyOkStatusOptions
  exceptionHandlingOptions?: WithLegacyExceptionHandlingOptions
}

export const withLegacyExceptionHandling =
  ({
    addOkStatus = false,
    okStatusOptions,
    exceptionHandlingOptions,
  }: ExceptionHandlingOptions = {}) =>
  (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  (req: NextApiRequest, res: NextApiResponse) => {
    if (addOkStatus) {
      return withLegacyOkStatus(okStatusOptions)(
        unwrappedWithLegacyExceptionHandling(exceptionHandlingOptions)(next)
      )(req, res)
    }

    return unwrappedWithLegacyExceptionHandling(exceptionHandlingOptions)(next)(
      req,
      res
    )
  }

