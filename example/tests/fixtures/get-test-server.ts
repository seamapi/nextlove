import getNextJSFixture from "../../.nsm/get-server-fixture"

export default async (t) => {
  const sharedDbMw = (next) => (req, res) => {
    return next(req, res)
  }

  const fixture = await getNextJSFixture(t, {
    middlewares: [sharedDbMw],
  })

  return {
    ...fixture,
  }
}
