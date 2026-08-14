import test from "ava"
import { z } from "zod"
import { createWithRouteSpec } from "../../src/with-route-spec/index.js"

test("route-level onMultipleAuthMiddlewareFailures spec takes precedent", async (t) => {
  let globalWasCalled = false
  let routeWasCalled = false
  const globalErrorHandler = () => void (globalWasCalled = true)
  const routeErrorHandler = () => void (routeWasCalled = true)
  const withRouteSpec = createWithRouteSpec({
    apiName: "test",
    productionServerUrl: "https://seam.com",
    globalMiddlewares: [],
    authMiddlewareMap: {
      test: () => {
        throw new Error("test")
      },
    },
    onMultipleAuthMiddlewareFailures: globalErrorHandler,
  })
  const route = withRouteSpec({
    methods: ["POST"],
    auth: "test",
    onMultipleAuthMiddlewareFailures: routeErrorHandler,
    handler: () => void 0,
  })
  await t.notThrowsAsync(async () =>
    route(async () => void 0)(
      {} as any,
      {
        status() {
          return { json() {} }
        },
      } as any
    )
  )

  t.false(globalWasCalled)
  t.true(routeWasCalled)
})

// Next.js parses repeated query params into an array.
const toNextQuery = (searchParams: URLSearchParams) => {
  const query: Record<string, string | string[]> = {}
  for (const [key, value] of searchParams) {
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      query[key] = [existing, value]
    }
  }
  return query
}

const getQueryParams = async (
  routeSpec: {
    queryParams: z.ZodTypeAny
    useLegacyQueryParamsParser?: boolean
    strictQueryParamsParser?: boolean
  },
  url: string
) => {
  const withRouteSpec = createWithRouteSpec({
    apiName: "test",
    productionServerUrl: "https://seam.com",
    globalMiddlewares: [],
    authMiddlewareMap: {},
  })
  const route = withRouteSpec({
    methods: ["GET"],
    auth: "none",
    ...routeSpec,
  } as any)

  let query: any
  const req = {
    method: "GET",
    url,
    query: toNextQuery(new URL(url, "https://example.com").searchParams),
    headers: {},
  }
  await route(async (req: any) => void (query = req.query))(
    req as any,
    {
      status() {
        return { json() {} }
      },
    } as any
  )

  return query
}

const idsQueryParams = z.object({ ids: z.array(z.string()) })
const flagQueryParams = z.object({ flag: z.boolean() })

test("query params are parsed with the legacy parser by default", async (t) => {
  // The legacy parser coerces any boolean string other than "true" to false.
  t.deepEqual(
    await getQueryParams(
      { queryParams: flagQueryParams },
      "/api/test?flag=yolo"
    ),
    { flag: false }
  )

  for (const query of ["ids=a,b", "ids[]=a&ids[]=b", "ids=a&ids=b"]) {
    t.deepEqual(
      await getQueryParams(
        { queryParams: idsQueryParams },
        `/api/test?${query}`
      ),
      { ids: ["a", "b"] },
      query
    )
  }
})

test("route-level useLegacyQueryParamsParser spec takes precedent", async (t) => {
  t.deepEqual(
    await getQueryParams(
      { queryParams: flagQueryParams, useLegacyQueryParamsParser: false },
      "/api/test?flag=yes"
    ),
    { flag: true },
    "parses generous booleans with @seamapi/url-search-params-parser"
  )

  for (const query of ["ids=a,b", "ids[]=a&ids[]=b", "ids=a&ids=b"]) {
    t.deepEqual(
      await getQueryParams(
        { queryParams: idsQueryParams, useLegacyQueryParamsParser: false },
        `/api/test?${query}`
      ),
      { ids: ["a", "b"] },
      query
    )
  }
})

test("optional query params that are not sent are omitted", async (t) => {
  const query = await getQueryParams(
    {
      queryParams: z.object({
        ids: z.array(z.string()).optional(),
        flag: z.boolean().optional(),
      }),
      useLegacyQueryParamsParser: false,
    },
    "/api/test?ids=a"
  )

  t.deepEqual(Object.keys(query), ["ids"], "flag is not a key of req.query")
})

const getQueryParamsError = async (
  routeSpec: {
    queryParams: z.ZodTypeAny
    useLegacyQueryParamsParser?: boolean
    strictQueryParamsParser?: boolean
  },
  url: string
) => {
  const withRouteSpec = createWithRouteSpec({
    apiName: "test",
    productionServerUrl: "https://seam.com",
    globalMiddlewares: [],
    authMiddlewareMap: {},
  })
  const route = withRouteSpec({
    methods: ["GET"],
    auth: "none",
    ...routeSpec,
  } as any)

  let status: number | undefined
  let body: any
  await route(async () => void 0)(
    {
      method: "GET",
      url,
      query: toNextQuery(new URL(url, "https://example.com").searchParams),
      headers: {},
    } as any,
    {
      status(code: number) {
        status = code
        return {
          json(json: any) {
            body = json
          },
        }
      },
    } as any
  )

  return { status, type: body?.error?.type, message: body?.error?.message }
}

// The serializer emits a comma inside an array value percent-encoded, but
// URLSearchParams decodes it before the parser runs, so generous mode cannot
// tell it apart from the comma array format.
const commaArrayUrl = "/api/test?names=a%2Cb&names=c"
const namesQueryParams = z.object({ names: z.array(z.string()) })

test("_strict selects strict parsing per request", async (t) => {
  t.deepEqual(
    await getQueryParams(
      { queryParams: namesQueryParams, useLegacyQueryParamsParser: false },
      `${commaArrayUrl}&_strict=true`
    ),
    { names: ["a,b", "c"] },
    "an array value containing a comma round trips"
  )

  const generous = await getQueryParamsError(
    { queryParams: namesQueryParams, useLegacyQueryParamsParser: false },
    commaArrayUrl
  )
  t.is(generous.status, 400, "the same request is unparseable when generous")
  t.is(generous.type, "invalid_query_params")
})

test("_strict is consumed and never reaches the route", async (t) => {
  const query = await getQueryParams(
    {
      queryParams: z.object({ ids: z.array(z.string()) }),
      useLegacyQueryParamsParser: false,
    },
    "/api/test?ids=a&_strict=true"
  )

  t.deepEqual(query, { ids: ["a"] })
})

test("only _strict=true asks for strict parsing", async (t) => {
  // "true" is the one spelling a strict boolean has, so nothing else is a
  // request for strict parsing, and every other value is ignored.
  for (const value of ["false", "ture", "1", "0", "yes", ""]) {
    t.deepEqual(
      await getQueryParams(
        { queryParams: flagQueryParams, useLegacyQueryParamsParser: false },
        `/api/test?flag=yes&_strict=${value}`
      ),
      { flag: true },
      `_strict=${value} leaves parsing generous`
    )
  }
})

test("_strict takes precedent over the route spec", async (t) => {
  const strictSpec = {
    queryParams: flagQueryParams,
    useLegacyQueryParamsParser: false,
    strictQueryParamsParser: true,
  }

  t.deepEqual(
    await getQueryParams(strictSpec, "/api/test?flag=yes&_strict=false"),
    { flag: true },
    "generous boolean spellings are accepted again"
  )

  const { status } = await getQueryParamsError(strictSpec, "/api/test?flag=yes")
  t.is(status, 400, "without the param the route stays strict")
})
