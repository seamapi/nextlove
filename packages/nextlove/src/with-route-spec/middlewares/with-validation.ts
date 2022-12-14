import type { NextApiRequest, NextApiResponse } from "next"
import { z, ZodFirstPartyTypeKind } from "zod"
import { BadRequestException } from "nextjs-exception-middleware"
import { isEmpty } from "lodash"

const parseCommaSeparateArrays = (
  schema: z.ZodTypeAny,
  input: Record<string, unknown>
) => {
  const parsed_input = Object.assign({}, input)

  if (schema._def.typeName === ZodFirstPartyTypeKind.ZodObject) {
    const obj_schema = schema as z.ZodObject<any>

    for (const [key, value] of Object.entries(obj_schema.shape)) {
      if (
        (value as z.ZodTypeAny)._def.typeName === ZodFirstPartyTypeKind.ZodArray
      ) {
        const array_input = input[key]

        if (typeof array_input === "string") {
          parsed_input[key] = array_input.split(",")
        }

        if (Array.isArray(input[`${key}[]`])) {
          parsed_input[key] = input[`${key}[]`]
        }
      }
    }
  }

  return schema.parse(parsed_input)
}

export interface RequestInput<
  JsonBody extends z.ZodTypeAny,
  QueryParams extends z.ZodTypeAny,
  CommonParams extends z.ZodTypeAny,
  FormData extends z.ZodTypeAny
> {
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
  formData?: FormData
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
    CommonParams extends z.ZodTypeAny,
    FormData extends z.ZodTypeAny
  >(
    input: RequestInput<JsonBody, QueryParams, CommonParams, FormData>
  ) =>
  (next) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (
      (input.formData && input.jsonBody) ||
      (input.formData && input.commonParams)
    ) {
      throw new Error("Cannot use formData with jsonBody or commonParams")
    }

    if (
      (req.method === "POST" || req.method === "PATCH") &&
      (input.jsonBody || input.commonParams) &&
      !req.headers["content-type"]?.includes("application/json") &&
      !isEmpty(req.body)
    ) {
      throw new BadRequestException({
        type: "invalid_content_type",
        message: `${req.method} requests must have Content-Type header with "application/json"`,
      })
    }

    if (
      input.formData &&
      req.method !== "GET" &&
      !req.headers["content-type"]?.includes(
        "application/x-www-form-urlencoded"
      )
      // TODO eventually we should support multipart/form-data
    ) {
      throw new BadRequestException({
        type: "invalid_content_type",
        message: `Must have Content-Type header with "application/x-www-form-urlencoded"`,
      })
    }

    try {
      const original_combined_params = { ...req.query, ...req.body }
      req.body =
        input.formData && req.method !== "GET"
          ? input.formData?.parse(req.body)
          : input.jsonBody?.parse(req.body)
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
