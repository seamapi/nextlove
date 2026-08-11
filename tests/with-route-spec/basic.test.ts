import test from "ava"
import { createWithRouteSpec } from "../../src/with-route-spec"

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
