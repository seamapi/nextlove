# nextlove - Enhanced NextJS API Types, OpenAPI and Utilities

This repo consists of NextJS utility modules used by Seam, namely:

- nextjs-exception-middleware
- nextjs-server-modules
- withRouteSpec
- wrappers
- OpenAPI generation utilities

## Installation

`yarn add nextlove`

## Usage

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

### wrappers

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

### nextjs-server-modules

Add a build script `{ "build": "nsm build" }`.

The build process will output a `.nsm/index.ts` file which can be used to create your server or invoke requests against it.

```ts
import myNextJSModule from "./.nsm"

const server = await myNextJSModule({
  port: 3030,
  middlewares: [myMiddleware],
})

// your server is running on localhost:3030!

server.close()
```
