import test from "ava"
import getTestServer from "../fixtures/get-test-server"

test("GET /api/health", async (t) => {
  const { axios } = await getTestServer(t)
  const res = await axios.get("/api/health")

  t.truthy(res.data.ok)
})
