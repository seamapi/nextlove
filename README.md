# NextJS API

This repo consists of NextJS utility modules used by Seam, namely:

- nextjs-exception-middleware
- nextjs-server-modules
- withRouteSpec
- wrappers

## Installation

`yarn add nextjs-api`

## Usage

### withRouteSpec

```ts
import { createWithRouteSpec } from "nextjs-api"
export { checkRouteSpec } from "nextjs-api"
import { z } from "zod"

export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [globalMiddleware],
})

export const route_spec = checkRouteSpec({
  methods: ["GET"],
  auth: "auth_token", // or "none"
  queryParams: z.object({
    id: z.string().uuid(),
  }),
})

export default withRouteSpec(route_spec)(async (req, res) => {
  /* ... */
  return res.status(200).json({ ok: true })
})
```

### wrappers

```ts
import { wrappers } from "nextjs-api"

wrappers(withDatabase, logger.withContext("somecontext"), async (req, res) => {
  res.status(200).end("...")
})
```

### nextjs-exception-middleware

```ts
import { BadRequestException } from "nextjs-api"

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
