import type { NextApiRequest, NextApiResponse } from "next"
import { z } from "zod"
import { BadRequestException } from "nextjs-exception-middleware"
import { isEmpty } from "lodash"

const parseCommaSeparateArrays = (
  schema: z.ZodTypeAny,
  input: Record<string, unknown>
) => {
  const parsed_input = Object.assign({}, input)

  // todo: iterate over Zod top level keys, if there's an array, parse it
  // HACK - Handling this one case of a comma-separate string array
  if (typeof parsed_input.device_ids === "string") {
    parsed_input.device_ids = parsed_input.device_ids.split(",")
  }

  return schema.parse(parsed_input)
}

export interface RequestInput<
  JsonBody extends z.ZodTypeAny,
  QueryParams extends z.ZodTypeAny,
  CommonParams extends z.ZodTypeAny
> {
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
}

export const withValidation =
  <
    JsonBody extends z.ZodTypeAny,
    QueryParams extends z.ZodTypeAny,
    CommonParams extends z.ZodTypeAny
  >(
    input: RequestInput<JsonBody, QueryParams, CommonParams>
  ) =>
  (next) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (
      (req.method === "POST" || req.method === "PATCH") &&
      !req.headers["content-type"]?.includes("application/json") &&
      !isEmpty(req.body)
    ) {
      throw new BadRequestException({
        type: "invalid_content_type",
        message: `POST requests must have Content-Type header with "application/json"`,
      })
    }

    try {
      const original_combined_params = { ...req.query, ...req.body }
      req.body = input.jsonBody?.parse(req.body)
      req.query = input.queryParams?.parse(req.query)

      if (input.commonParams) {
        ;(req as any).commonParams = parseCommaSeparateArrays(
          input.commonParams,
          original_combined_params
        )
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          type: "invalid_input",
          message: "malformed input",
          validation_errors: error.format(),
        })
      }

      throw new BadRequestException({
        type: "invalid_input",
        message: "Errored while parsing input",
      })
    }

    return next(req, res)
  }

export default withValidation
