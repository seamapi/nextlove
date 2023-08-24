import { NextApiRequest, NextApiResponse } from "next"
import {
  withExceptionHandlingLegacy as unwrappedWithExceptionHandlingLegacy,
  WithExceptionHandlingOptionsLegacy,
} from "./with-exception-handling"
import { withOkStatusLegacy, WithOkStatusOptionsLegacy } from "./with-ok-status"

export interface ExceptionHandlingOptionsLegacy {
  addOkStatus?: boolean
  okStatusOptions?: WithOkStatusOptionsLegacy
  exceptionHandlingOptions?: WithExceptionHandlingOptionsLegacy
}

export const withExceptionHandlingLegacy =
  ({
    addOkStatus = false,
    okStatusOptions,
    exceptionHandlingOptions,
  }: ExceptionHandlingOptionsLegacy = {}) =>
  (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  (req: NextApiRequest, res: NextApiResponse) => {
    if (addOkStatus) {
      return withOkStatusLegacy(okStatusOptions)(
        unwrappedWithExceptionHandlingLegacy(exceptionHandlingOptions)(next)
      )(req, res)
    }

    return unwrappedWithExceptionHandlingLegacy(exceptionHandlingOptions)(next)(
      req,
      res
    )
  }

export * from "./with-exception-handling"
export * from "./with-ok-status"
