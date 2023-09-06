import { NextApiRequest, NextApiResponse } from "next"

export interface WithOkStatusOptionsLegacy {
  addIf?: (req: NextApiRequest) => boolean
}

export const withOkStatusLegacy =
  (options: WithOkStatusOptionsLegacy = {}) =>
  (next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    // Patch .json()
    const originalJson = res.json

    res.json = function (data) {
      const ok = res.statusCode >= 200 && res.statusCode < 300
      const shouldIncludeStatus = options.addIf ? options.addIf(req) : true

      if (shouldIncludeStatus) {
        originalJson.call(this, {
          ...data,
          ok,
        })
      } else {
        originalJson.call(this, data)
      }
    }

    await next(req, res)
  }
