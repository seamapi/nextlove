import anyTest, { TestFn } from "ava"
import sinon from "sinon"
import {
  HttpException,
  withExceptionHandling,
} from "../../src/nextjs-exception-middleware"

type TestContext = {
  mockRequest: any
  mockResponse: any
  getReturnedStatusCode: () => number
  getReturnedJson: () => JSON
}

const test = anyTest as TestFn<TestContext>

test.beforeEach((t) => {
  const mockRequest = {}
  const mockResponse: any = {}

  mockResponse.status = sinon.stub().callsFake((status: number) => {
    mockResponse.statusCode = status
    return mockResponse
  })
  const stubbedJson = sinon.stub().returns(mockResponse)
  mockResponse.json = stubbedJson

  t.context = {
    mockRequest,
    mockResponse,
    getReturnedStatusCode: () => mockResponse.status.lastCall.args[0],
    getReturnedJson: () => stubbedJson.lastCall.args[0],
  }
})

test("catches errors", async (t) => {
  const { mockRequest, mockResponse, getReturnedStatusCode, getReturnedJson } =
    t.context

  const routeHandler = withExceptionHandling()(() => {
    throw new Error("foo")
  })

  await routeHandler(mockRequest, mockResponse)

  t.is(getReturnedStatusCode(), 500)
  t.like(getReturnedJson(), {
    error: {
      type: "internal_server_error",
      message: "foo",
    },
  })
})

test("catches http exceptions", async (t) => {
  const { mockRequest, mockResponse, getReturnedStatusCode, getReturnedJson } =
    t.context

  const routeHandler = withExceptionHandling()(() => {
    throw new HttpException(400, {
      type: "bad_request",
      message: "foo",
    })
  })

  await routeHandler(mockRequest, mockResponse)

  t.is(getReturnedStatusCode(), 400)
  t.like(getReturnedJson(), {
    error: {
      type: "bad_request",
      message: "foo",
    },
  })
})

test("adds ok status", async (t) => {
  const { mockRequest, mockResponse, getReturnedJson } = t.context

  const routeHandler = withExceptionHandling({ addOkStatus: true })(() => {
    throw new Error("foo")
  })

  await routeHandler(mockRequest, mockResponse)

  t.like(getReturnedJson(), {
    ok: false,
  })
})

test("only adds ok status if conditions are met", async (t) => {
  const { mockResponse, getReturnedJson } = t.context

  const routeHandler = withExceptionHandling({
    addOkStatus: true,
    okStatusOptions: {
      addIf: (req) => req.url!.includes("/admin"),
    },
  })(async (req, res) => {
    res.status(200).json({ hello: "world" })
  })

  await routeHandler({ url: "/not-admin" } as any, mockResponse)

  t.like(getReturnedJson(), {
    ok: undefined,
  })
})

test("only adds error context if conditions are met", async (t) => {
  const { mockResponse, getReturnedJson } = t.context

  const routeHandler = withExceptionHandling({
    exceptionHandlingOptions: {
      getErrorContext(req, error: any) {
        if (!req.url) return error
        if (req.url.includes("/admin")) return error
        delete error.stack
        return error
      },
    },
  })(async (req, res) => {
    throw new Error("foo")
  })

  await routeHandler({ url: "/admin" } as any, mockResponse)

  t.not((getReturnedJson() as any).error.stack, undefined)

  await routeHandler({ url: "/not-admin" } as any, mockResponse)

  t.is((getReturnedJson() as any).error.stack, undefined)
})

test("adds additional data to error context", async (t) => {
  const { mockResponse, getReturnedJson } = t.context

  const routeHandler = withExceptionHandling({
    exceptionHandlingOptions: {
      getErrorContext(req, error: any) {
        error._url = req.url
        return error
      },
    },
  })(async (req, res) => {
    throw new Error("foo")
  })

  await routeHandler({ url: "/admin" } as any, mockResponse)

  t.is((getReturnedJson() as any).error._url, "/admin")
})
