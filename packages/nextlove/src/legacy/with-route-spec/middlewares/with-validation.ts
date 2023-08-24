import type { NextApiRequest, NextApiResponse } from "next"
import { z } from "zod"
import _ from "lodash"

import { QueryArrayFormats } from "../../../types"
import { DEFAULT_ARRAY_FORMATS } from "../../../with-route-spec/middlewares/with-validation"
import {
  BadRequestException,
  InternalServerErrorException,
} from "../../../http-exceptions"
import { parseQueryParams, validateQueryParams } from "../../../zod-helpers"

export interface RequestInputLegacy<
  JsonBody extends z.ZodTypeAny,
  QueryParams extends z.ZodTypeAny,
  CommonParams extends z.ZodTypeAny,
  FormData extends z.ZodTypeAny,
  JsonResponse extends z.ZodTypeAny
> {
  jsonBody?: JsonBody
  queryParams?: QueryParams
  commonParams?: CommonParams
  formData?: FormData
  jsonResponse?: JsonResponse
  shouldValidateResponses?: boolean
  shouldValidateGetRequestBody?: boolean
  supportedArrayFormats?: QueryArrayFormats
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

function validateJsonResponse<JsonResponse extends z.ZodTypeAny>(
  jsonResponse: JsonResponse | undefined,
  res: NextApiResponse
) {
  const original_res_json = res.json
  const override_res_json = (json: any) => {
    const is_success = res.statusCode >= 200 && res.statusCode < 300
    if (!is_success) {
      return original_res_json(json)
    }

    try {
      jsonResponse?.parse(json)
    } catch (err) {
      throw new InternalServerErrorException({
        type: "invalid_response",
        message: "the response does not match with jsonResponse",
        zodError: err,
      })
    }

    return original_res_json(json)
  }
  res.json = override_res_json
}

export const withValidationLegacy =
  <
    JsonBody extends z.ZodTypeAny,
    QueryParams extends z.ZodTypeAny,
    CommonParams extends z.ZodTypeAny,
    FormData extends z.ZodTypeAny,
    JsonResponse extends z.ZodTypeAny
  >(
    input: RequestInputLegacy<
      JsonBody,
      QueryParams,
      CommonParams,
      FormData,
      JsonResponse
    >
  ) =>
  (next) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { supportedArrayFormats = DEFAULT_ARRAY_FORMATS } = input

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
      !_.isEmpty(req.body)
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

      const willValidateRequestBody = input.shouldValidateGetRequestBody
        ? true
        : req.method !== "GET"

      const isFormData = Boolean(input.formData)

      if (isFormData && willValidateRequestBody) {
        req.body = input.formData?.parse(req.body)
      }

      if (!isFormData && willValidateRequestBody) {
        req.body = input.jsonBody?.parse(req.body)
      }

      if (input.queryParams) {
        if (!req.url) {
          throw new Error("req.url is undefined")
        }

        validateQueryParams(req.url, input.queryParams, supportedArrayFormats)

        req.query = parseQueryParams(
          input.queryParams,
          req.query,
          supportedArrayFormats
        )
      }

      if (input.commonParams) {
        /**
         * as commonParams includes query params, we can use the parseQueryParams function
         */
        ;(req as any).commonParams = parseQueryParams(
          input.commonParams,
          original_combined_params,
          supportedArrayFormats
        )
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error
      }

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

    /**
     * this will override the res.json method to validate the response
     */
    if (input.shouldValidateResponses) {
      validateJsonResponse(input.jsonResponse, res)
    }

    return next(req, res)
  }
