import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"

test("GET /todo/auth-token-or-user-session", async (t) => {
  const { axios } = await getTestServer(t)

  const authTokenResponse = await axios.get(
    "/todo/auth-token-or-user-session",
    {
      params: {
        id: 0,
      },
      headers: {
        Authorization: `Bearer auth_token`,
      },
    }
  )
  t.is(authTokenResponse.data.auth_type, "auth_token")

  const userSessionResponse = await axios.get(
    "/todo/auth-token-or-user-session",
    {
      params: {
        id: 0,
      },
      headers: {
        "X-User-Session-Token": "user_session_token",
      },
    }
  )
  t.is(userSessionResponse.data.auth_type, "user_session")

  // Generic error if neither is provided
  const noAuthResponse = await axios.get("/todo/auth-token-or-user-session", {
    validateStatus: () => true,
  })
  t.is(noAuthResponse.status, 401)
  // Message set by custom onMultipleAuthMiddlewareFailures() hook
  t.true(
    noAuthResponse.data.error.message.includes(
      "Multiple auth middleware failures"
    )
  )
})

test("GET /todo/auth-token-or-user-session (error in response was bubbled up correctly instead of being an auth error from user_session middleware)", async (t) => {
  const { axios } = await getTestServer(t)

  const malformedRequestResponse = await axios.get(
    "/todo/auth-token-or-user-session",
    {
      headers: {
        Authorization: `Bearer auth_token`,
      },
      validateStatus: () => true,
    }
  )
  t.is(malformedRequestResponse.status, 400)
})
