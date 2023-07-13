import { z } from "zod"
import {
  BadRequestException,
  InternalServerErrorException,
} from "../http-exceptions"
import { isEmpty } from "lodash"
import { NextloveRequest } from "../edge-helpers"
import { parseQueryParams, zodIssueToString } from "../zod-helpers"

export interface RequestInput<
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
}

// NOTE: we should be able to use the same validation logic for both the nodejs and edge runtime
function validateJsonResponse<JsonResponse extends z.ZodTypeAny>(
  jsonResponse: JsonResponse | undefined,
  req: NextloveRequest
) {
  const original_res_json = req.responseEdge.json
  const override_res_json: NextloveRequest["responseEdge"]["json"] = (
    body,
    params
  ) => {
    const is_success =
      req.responseEdge.statusCode >= 200 && req.responseEdge.statusCode < 300
    if (!is_success) {
      return original_res_json(body, params)
    }

    try {
      jsonResponse?.parse(body)
    } catch (err) {
      throw new InternalServerErrorException({
        type: "invalid_response",
        message: "the response does not match with jsonResponse",
        zodError: err,
      })
    }

    return original_res_json(body, params)
  }

  req.responseEdge.json = override_res_json
}

export const withValidationEdge =
  <
    JsonBody extends z.ZodTypeAny,
    QueryParams extends z.ZodTypeAny,
    CommonParams extends z.ZodTypeAny,
    FormData extends z.ZodTypeAny,
    JsonResponse extends z.ZodTypeAny
  >(
    input: RequestInput<
      JsonBody,
      QueryParams,
      CommonParams,
      FormData,
      JsonResponse
    >
  ) =>
  (next) =>
  async (req: NextloveRequest) => {
    if (
      (input.formData && input.jsonBody) ||
      (input.formData && input.commonParams)
    ) {
      throw new Error("Cannot use formData with jsonBody or commonParams")
    }
    const { searchParams } = new URL(req.url)
    const paramsArray = Array.from(searchParams.entries())
    let edgeQuery = Object.fromEntries(paramsArray)

    const isBodyPresent = !!req.body

    let bodyEdge: any
    if (isBodyPresent) {
      bodyEdge = await req.json()
    }

    const contentType = req.headers.get("content-type")

    const isContentTypeJson = contentType?.includes("application/json")
    const isContentTypeFormUrlEncoded = contentType?.includes(
      "application/x-www-form-urlencoded"
    )

    if (
      (req.method === "POST" || req.method === "PATCH") &&
      (input.jsonBody || input.commonParams) &&
      !isContentTypeJson &&
      !isEmpty(bodyEdge)
    ) {
      throw new BadRequestException({
        type: "invalid_content_type",
        message: `${req.method} requests must have Content-Type header with "application/json"`,
      })
    }

    if (
      input.formData &&
      req.method !== "GET" &&
      !isContentTypeFormUrlEncoded
      // TODO eventually we should support multipart/form-data
    ) {
      throw new BadRequestException({
        type: "invalid_content_type",
        message: `Must have Content-Type header with "application/x-www-form-urlencoded"`,
      })
    }

    try {
      const original_combined_params = { ...edgeQuery, ...bodyEdge }

      const willValidateRequestBody = input.shouldValidateGetRequestBody
        ? true
        : req.method !== "GET"

      const isFormData = Boolean(input.formData)

      if (isFormData && willValidateRequestBody) {
        ;(req as any).edgeBody = input.formData?.parse(bodyEdge)
      }

      if (!isFormData && willValidateRequestBody) {
        ;(req as any).edgeBody = input.jsonBody?.parse(bodyEdge)
      }

      if (input.queryParams) {
        ;(req as any).edgeQuery = parseQueryParams(input.queryParams, edgeQuery)
      }

      if (input.commonParams) {
        /**
         * as commonParams includes query params, we can use the parseQueryParams function
         */
        ;(req as any).commonParams = parseQueryParams(
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

    /**
     * this will override the res.json method to validate the response
     */
    if (input.shouldValidateResponses) {
      validateJsonResponse(input.jsonResponse, req)
    }

    return next(req)
  }
