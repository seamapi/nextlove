# nextlove - Enhanced NextJS API Types, OpenAPI and Utilities



## Installation

`yarn add nextlove`

## Create well-typed routes + middleware with nextlove!

`nextlove` allows you 

### withRouteSpec

```ts
// lib/with-route-spec.ts
export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [globalMiddleware],

  // For OpenAPI Generation
  apiName: "My API",
  productionServerUrl: "https://example.com",
})
```

```ts
import { createWithRouteSpec } from "nextlove"
export { checkRouteSpec } from "nextlove"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  auth: "auth_token", // or "none"
  queryParams: z.object({
    id: z.string().uuid(),
  }),
})(async (req, res) => {
  /* ... */
  return res.status(200).json({ ok: true })
})
```

### Generating OpenAPI Types

Just run `nextlove generate-openapi` in your project root!

Examples:
```bash
nextlove generate-openapi --
```

| Parameter | Description |
| --------- | ----------- |
| | |


### Wrap middlewares together using `wrappers`!

```ts
import { wrappers } from "nextlove"

wrappers(withDatabase, logger.withContext("somecontext"), async (req, res) => {
  res.status(200).end("...")
})
```

### nextjs-exception-middleware

```ts
import { BadRequestException } from "nextlove"

// Inside a route handler
if (bad_soups.includes(soup_param)) {
  throw new BadRequestException({
    type: "cant_make_soup",
    message: "Soup was too difficult, please specify a different soup",
    data: { soup_param },
  })
}
```

### Additional Modules

This repo bundles NextJS utility modules including...

- nextjs-exception-middleware
- nextjs-server-modules
- nextjs-middleware-wrappers
- openAPI generation utilities
