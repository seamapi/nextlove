import {
  parseUrlSearchParams,
  UnparseableSchemaError,
  UnparseableSearchParamError,
} from "@seamapi/url-search-params-parser"
import { z } from "zod"

import {
  BadRequestException,
  InternalServerErrorException,
} from "../../nextjs-exception-middleware/index.js"

/**
 * Parses the query string with @seamapi/url-search-params-parser, then
 * merges in params the parser has no knowledge of: Next.js dynamic route
 * params, which are in req.query but not in the query string, and params
 * not present in the schema, so strict and passthrough object schemas
 * keep rejecting or forwarding unknown params.
 *
 * The returned object is not validated: pass it to schema.parse.
 */
export const parseQueryParamsFromUrl = (
  schema: z.ZodTypeAny,
  inputUrl: string,
  routeQuery: Record<string, unknown>
): Record<string, unknown> => {
  const { searchParams } = new URL(inputUrl, "https://example.com")

  let parsed: Record<string, unknown>
  try {
    parsed = parseUrlSearchParams(searchParams, schema, { strict: false })
  } catch (error: unknown) {
    if (error instanceof UnparseableSearchParamError) {
      throw new BadRequestException({
        type: "invalid_query_params",
        message: error.message,
      })
    }

    if (error instanceof UnparseableSchemaError) {
      throw new InternalServerErrorException({
        type: "unparseable_schema",
        message: error.message,
      })
    }

    throw error
  }

  // The parser returns only the params it found in the query string.
  const parsed_keys = new Set(Object.keys(parsed))

  for (const [key, value] of Object.entries(routeQuery)) {
    if (parsed_keys.has(key)) continue

    // Alternate forms of a param the parser already handled.
    if (key.endsWith("[]") && parsed_keys.has(key.slice(0, -2))) continue
    const [root_key] = key.split(".")
    if (root_key !== key && parsed_keys.has(root_key)) continue

    parsed[key] = value
  }

  return parsed
}
