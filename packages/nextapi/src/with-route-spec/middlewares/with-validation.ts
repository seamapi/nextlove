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

const zodIssueToString = (issue: z.ZodIssue) => {
  if (issue.path.join(".") === "") {
    return issue.message
  }
  if (issue.message === "Required") {
    return `${issue.path.join(".")} is required`
  }
  return `${issue.message} for "${issue.path.join(".")}"`
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
    } catch (error: any) {
      if (error.name === "ZodError") {
        let message
        if (error.issues.length === 1) {
          const issue = error.issues[0]
          message = zodIssueToString(issue)
        } else {
          const message_components: string[] = []
          for (const issue of error.issues) {
            message_components.push(zodIssueToString(issue))
          }
          message =
            `${error.issues.length} Input Errors: ` +
            message_components.join(", ")
        }

        throw new BadRequestException({
          type: "invalid_input",
          message,
          validation_errors: error.format(),
        })
      }

      throw new BadRequestException({
        type: "invalid_input",
        message: "Error while parsing input",
      })
    }

    return next(req, res)
  }

export default withValidation
