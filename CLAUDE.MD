# CLAUDE.MD - nextlove

## Project Overview

**nextlove** is an enhanced Next.js API library for creating type-safe routes with automatic OpenAPI specification generation. It enables developers to define API endpoints with type-safe middleware, automatic TypeScript type generation, and OpenAPI documentation from Zod schemas.

**Repository**: https://github.com/seamapi/nextlove
**Current Version**: 2.20.0

## Key Commands

```bash
# Development
yarn dev                    # Start dev servers
yarn build                  # Build all packages
yarn lint                   # Run ESLint
yarn format                 # Format with Prettier
yarn format:check           # Check formatting

# Testing
yarn test                   # Build + run all tests
yarn example:test           # Build example app + run tests

# CLI Tools (nextlove binary)
nextlove generate-openapi --packageDir . --outputFile openapi.json
nextlove generate-route-types --packageDir .
nextlove extract-route-specs --packageDir . --outputFile dist/specs.mjs
```

## Project Structure

```
nextlove/
├── packages/
│   ├── nextlove/                    # Main library (npm package)
│   │   ├── src/
│   │   │   ├── with-route-spec/     # Route spec wrapper and middleware chain
│   │   │   ├── nextjs-exception-middleware/  # HTTP exception handling
│   │   │   ├── wrappers/            # Middleware composition utilities
│   │   │   ├── generators/          # CLI generators (OpenAPI/types/specs)
│   │   │   └── types/               # Core type definitions
│   │   ├── tests/                   # ava test suite
│   │   └── bin.js                   # CLI entry point
│   │
│   └── eslint-plugin/               # ESLint plugin for nextlove
│
└── apps/
    └── example-todo-app/            # Example Next.js application
        ├── pages/api/               # API route examples
        └── lib/middlewares/         # Auth middleware examples
```

## Core Technologies

- **Next.js 12+** with TypeScript 5.0+
- **Zod 3.0+** for schema validation
- **tsup** for dual ESM/CJS bundling
- **ava** for testing with esbuild-register
- **Turbo** for monorepo orchestration

## Development Conventions

### Route Definition Pattern

Always use `as const` for proper type inference:

```typescript
export const route_spec = checkRouteSpec({
  methods: ["POST"],
  auth: "auth_token",
  jsonBody: z.object({ content: z.string() }),
  jsonResponse: z.object({ ok: z.boolean() }),
} as const)

export default withRouteSpec(route_spec)(async (req, res) => {
  return res.status(200).json({ ok: true })
})
```

### Setup Configuration

```typescript
const withRouteSpec = createWithRouteSpec({
  authMiddlewareMap: { auth_token: withAuthToken },
  globalMiddlewares: [logger],
  globalSchemas: { todo, user },
  apiName: "TODO API",
  shouldValidateResponses: true,
})
```

### Error Handling

```typescript
import { BadRequestException, UnauthorizedException } from "nextlove"

throw new BadRequestException({
  type: "invalid_input",
  message: "The provided input was invalid",
})
```

### File Organization

- `lib/middlewares/with-route-spec.ts` - Centralized route spec creation
- `lib/middlewares/with-auth-*.ts` - Auth strategy implementations
- `lib/zod.ts` - Shared Zod schemas
- `pages/api/**` - API route implementations

## Testing

- Test files: `**/*.test.ts` in `tests/` directories
- Uses ava with esbuild-runner for TypeScript
- Example server fixture pattern with axios for HTTP testing

## Code Quality

- **Formatting**: Prettier with `semi: false`
- **Linting**: ESLint with custom nextlove rules
- **Build Output**: Dual ESM/CJS with TypeScript declarations
- **CI**: Runs tests and lint on all pushes; semantic-release on main
