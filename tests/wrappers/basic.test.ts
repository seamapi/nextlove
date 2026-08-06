import test from "ava"
import {
  wrappers,
  SaferMiddleware,
  Middleware,
  extendRequest,
} from "../../src/wrappers"

test("test wrappers types", async (t) => {
  const mw1: Middleware<{ mw1_artifact: number }> = (next) => (req, res) => {
    req.mw1_artifact = 1
    next(req, res)
  }

  const mw1_safer: SaferMiddleware<{ mw1_artifact: number }> =
    (next) => (req, res) => {
      // This is a typesafe way to extend request, protects against artifacts not
      // being added to the request
      next(
        extendRequest(req, {
          mw1_artifact: 1,
        }),
        res
      )
    }

  const mw2: Middleware<{ mw2_artifact: number }> = (next) => (req, res) => {
    req.mw2_artifact = 2
    next(req, res)
  }

  const mw3: Middleware<{ mw3_artifact: number }, { mw1_artifact: number }> =
    (next) => (req, res) => {
      req.mw1_artifact // this is defined because of the dependency def
      next(req, res)
    }

  wrappers(mw1, (req, res) => {
    req
  })

  wrappers(mw1, mw2, (req, res) => {
    req
  })

  wrappers(mw1, mw3, (req, res) => {
    req
  })

  // This should throw because mw3 depends on mw1
  // @ts-expect-error
  wrappers(mw2, mw3, (req, res) => {
    req
  })

  wrappers(mw1, mw2, mw3, (req, res) => {
    req
  })

  // This should throw because mw3's dep is never met
  // @ts-expect-error
  wrappers(mw2, mw2, mw3, (req, res) => {
    req
  })

  // This should throw because mw3's dep isn't met in time
  // @ts-expect-error
  wrappers(mw2, mw3, mw1, (req, res) => {
    req
  })

  // This should throw because mw3's dep is never met
  // @ts-expect-error
  wrappers(mw2, mw2, mw2, mw3, (req, res) => {
    req
  })

  wrappers(mw2, mw2, mw1, mw3, (req, res) => {
    req
  })

  // This should throw because mw3's dep is never met
  // @ts-expect-error
  wrappers(mw2, mw2, mw2, mw2, mw3, (req, res) => {
    req
  })

  wrappers(mw2, mw2, mw1, mw2, mw3, (req, res) => {
    req
  })

  wrappers(mw2, mw2, mw1, mw2, mw2, mw3, (req, res) => {
    req
  })

  wrappers(mw2, mw2, mw1, mw2, mw2, mw2, mw3, (req, res) => {
    req
  })

  t.pass()
})
