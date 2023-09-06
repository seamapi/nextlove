import getNextJSFixture from "../../.nsm/get-server-fixture"
import getServerFixture from "nextjs-ava-fixture"

export default async (t) => {
  const sharedDbMw = (next) => (req, res) => {
    return next(req, res)
  }

  const fixture = await getServerFixture(t, {
    middlewares: [sharedDbMw],
  })

  return {
    ...fixture,
  }
}
