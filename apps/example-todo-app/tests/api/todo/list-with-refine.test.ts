import { axiosAssert } from "tests/fixtures/axios-assert"
import test from "ava"
import getTestServer from "tests/fixtures/get-test-server"
import { v4 as uuidv4 } from "uuid"

test("GET /todo/list-with-refine", async (t) => {
  const { axios } = await getTestServer(t)

  axios.defaults.headers.common.Authorization = `Bearer auth_token`

  const ids = [uuidv4(), uuidv4()]

  const responseWithArray = await axios.get("/api/todo/list-with-refine", {
    params: {
      ids,
    },
  })

  t.deepEqual(responseWithArray.data, {
    ok: true,
    todos: ids.map((id) => ({
      id,
    })),
  })

  const responseWithCommas = await axios.get("/api/todo/list-with-refine", {
    params: {
      ids: ids.join(","),
    },
  })

  t.deepEqual(responseWithCommas.data, {
    ok: true,
    todos: ids.map((id) => ({
      id,
    })),
  })

  const title = uuidv4()
  const responseWithTitle = await axios.get("/api/todo/list-with-refine", {
    params: {
      title,
    },
  })

  t.deepEqual(responseWithTitle.data, {
    ok: true,
    todos: [
      {
        id: title,
      },
    ],
  })

  await axiosAssert.throws(t, async () => axios.get("/api/todo/list-with-refine"), {
    status: 400,
    error: {
      type: "invalid_input",
      message: "Either title or ids must be provided",
    },
  })

  await axiosAssert.throws(
    t,
    async () =>
      axios.get("/api/todo/list-with-refine", {
        params: {
          title: "title",
          ids: ids.join(","),
        },
      }),
    {
      status: 400,
      error: {
        type: "invalid_input",
        message: "Must specify either title or ids",
      },
    }
  )

  await axiosAssert.throws(
    t,
    async () =>
      axios.get("/api/todo/list-with-refine", {
        params: {
          title:
            "A title big enough to test if nextlove is handling correct with nested .refine (from zod) with at least 101 characters long",
        },
      }),
    {
      status: 400,
      error: {
        type: "invalid_input",
        message: 'Title must be less than 100 characters for "title"',
      },
    }
  )
})
