# nextlove - Enhanced NextJS API Types, OpenAPI and Utilities

Make type-safe routes that automatically generate OpenAPI in NextJS easy!

* Define endpoints with middleware and have your request objects and responses automatically be typed.
* The same [zod](https://github.com/colinhacks/zod) schemas used for your types will be in the generated
`openapi.json` file!
* Throw [http exceptions and they'll magically be handled](https://github.com/seamapi/nextjs-exception-middleware#exception-types)
* Have well-typed middleware


## Installation

`yarn add nextlove`

## Create well-typed routes + middleware with nextlove!

`nextlove` allows you to create well-typed middleware and routes using utility types and functions. The
two main functions to know are `createWithRouteSpec`, which allows you to create a `withRouteSpec` function
that can be used with all your endpoints, and the `Middleware` utility function which makes middleware type-safe.

Let's take a look at an example project with three files:
* **lib/with-route-spec.ts** - This file is used to create the `withRouteSpec` middleware. This middleware should
  be used for all your routes.
* **lib/middlewares/with-auth-token.ts** - This is an authentication middleware we'll be using to make sure requests are authenticating
* **lib/middlewares/with-db.ts** - A common global middleware that attaches a database client to the request object
* **pages/api/health.ts** - Just a health endpoint to see if the server is running! It won't have any auth
* **pages/api/todos/add.ts** - An endpoint to add a TODO, this will help show how we can use auth!


```ts
// pages/api/health.ts
import { withRouteSpec } from "lib/with-route-spec"
import { z } from "zod"

const routeSpec = {
  methods: ["GET"],
  auth: "none",
  jsonResponse: z.object({
    healthy: z.boolean()
  })
} as const

export default withRouteSpec(routeSpec)(async (req, res) => {
  /* ... */
  return res.status(200).json({ healthy: true })
})
```

```ts
// lib/with-route-spec.ts
export const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [globalMiddleware],

  // For OpenAPI Generation
  apiName: "My API",
  productionServerUrl: "https://example.com",
} as const)
```

```ts
// lib/middlewares/with-auth-token.ts
import { UnauthorizedException, Middleware } from "nextlove"

export const withAuthToken: Middleware<{
  auth: {
    authorized_by: "auth_token"
  }
}> = (next) => async (req, res) => {

  req.auth = {
    authorized_by: "auth_token",
  }

  return next(req, res)
}

export default withAuthToken
```

```ts
// pages/api/todos/add.ts
import { withRouteSpec, UnauthorizedException } from "lib/with-route-spec"
import { z } from "zod"

const routeSpec = {
  methods: ["POST"],
  auth: "auth_token",
  jsonBody: z.object({
    content: z.string(),
  }),
  jsonResponse: z.object({
    ok: z.boolean()
  })
} as const

export default withRouteSpec(routeSpec)(async (req, res) => {
  // req.auth is correctly typed here!
  if (req.auth.authorized_by !== "auth_token") {
    throw new UnauthorizedException({
      type: "unauthorized",
      message: "Authenticate yourself to get the requested response"
    })
  }
  // TODO add todo
  return res.status(200).json({ ok: true })
})
```

## createWithRouteSpec Parameters

| Parameter | Description |
| --------- | ----------- |
| `authMiddlewareMap` | Object that maps different types of auth to their middleware |
| `globalMiddlewares` | Middlewares that should be applied on every route |
| `apiName` | Used as the name of the api in openapi.json |
| `productionServerUrl` | Used as the default server url in openapi.json |


## withRouteSpec Parameters

| Parameter | Description |
| --------- | ----------- |
| `methods` | HTTP Methods accepted by this route |
| `auth`    | `none` or a key from your `authMiddlewareMap`, this authentication middleware will be applied |
| `queryParams` | Any GET query parameters on the request as a zod object |
| `jsonBody` | The JSON body this endpoint accepts as a zod object |
| `commonParams` | Parameters common to both the query and json body as a zod object, this is sometimes used if a GET route also accepts POST |
| `jsonResponse` | A zod object representing the json resposne |

### Generating OpenAPI Types (Command Line)

Just run `nextlove generate-openapi` in your project root!

Examples:
```bash
# Print OpenAPI JSON directly to the command line for the package in the current directory
nextlove generate-openapi --packageDir .

# Write OpenAPI JSON to "openapi.json" file
nextlove generate-openapi . --outputFile openapi.json

# Only generate OpenAPI JSON for public api routes
nextlove generate-openapi . --pathGlob '/pages/api/public/**/*.ts'
```

| Parameter | Description |
| --------- | ----------- |
| `packageDir`| Path to directory containing package.json and NextJS project |
| `outputFile` | Path to output openapi.json file |
| `pathGlob` | Paths to consider as valid routes for OpenAPI generation, defaults to `/pages/api/**/*.ts` |
| `tags` | Tags improve the organization of an OpenAPI spec by making "expandable" sections including routes |
| `mapFilePathToHTTPRoute` | A function that takes a file path as input and maps it to a corresponding HTTP route. Each file found within the pathGlob will pass by this function |

### Generating OpenAPI Types (Script)

```ts
import { generateOpenAPI } from "nextlove"

generateOpenAPI({
  packageDir: ".",
  outputFile: "openapi.json",
  pathGlob: "/src/pages/api/**/*.ts",
  tags: [
    "users",
    "teams",
    "workspaces"
  ].map((t) => ({
    name: `/${t}`,
    description: t,
    doesRouteHaveTag: (route) => route.includes(`/${t}`),
  })),
  mapFilePathToHTTPRoute(fp) {
    return fp
      .replace("src/pages/api/public", "")
      .replace(/\.ts$/, "")
      .replace(/\/index$/, "")
  },
})
```

#### Understanding mapFilePathToHTTPRoute

```bash
src
└── pages
    └── api
        └── public
            └── hello
                └── index.ts
```

In the example above, the input file path is `/path/to/src/pages/api/public/hello/index.ts`. The mapFilePathToHTTPRoute function removes the string `src/pages/api/public`, the `.ts` extension, and the `/index` portion of the string, resulting in the output of `/hello`. The resulting string represents the HTTP route.

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

### All Modules

This repo bundles NextJS utility modules including...

- [nextjs-exception-middleware](https://github.com/seamapi/nextjs-exception-middleware)
- [nextjs-server-modules](https://github.com/seamapi/nextjs-server-modules)
- [nextjs-middleware-wrappers](https://github.com/seamapi/wrappers)
- openAPI generation utilities
