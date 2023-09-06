import { z } from "zod"
import { NextloveRequest, NextloveResponse, isEmpty } from "../../edge-helpers"
import {
  parseQueryParams,
  validateQueryParams,
  zodIssueToString,
} from "../../zod-helpers"
import { QueryArrayFormats } from "../../types"
import {
  BadRequestException,
  InternalServerErrorException,
} from "../../http-exceptions"

export const DEFAULT_ARRAY_FORMATS: QueryArrayFormats = [
  "brackets",
  "comma",
  "repeat",
]

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
  supportedArrayFormats?: QueryArrayFormats
}

function URLSearchParamsToJSON(searchParams: URLSearchParams) {
  return Array.from(searchParams.entries()).reduce((acc, cv) => {
    if (acc[cv[0]]) {
      if (Array.isArray(acc[cv[0]])) {
        acc[cv[0]].push(cv[1])
      } else {
        acc[cv[0]] = [acc[cv[0]], cv[1]]
      }
    } else {
      acc[cv[0]] = cv[1]
    }
    return acc
  }, {})
}

export const withValidation =
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
  async (req: NextloveRequest, res: NextloveResponse) => {
    const { supportedArrayFormats = DEFAULT_ARRAY_FORMATS } = input

    if (
      (input.formData && input.jsonBody) ||
      (input.formData && input.commonParams)
    ) {
      throw new Error("Cannot use formData with jsonBody or commonParams")
    }

    const searchParams = new URLSearchParams(req.url.split("?")[1] || "")
    const queryParams = URLSearchParamsToJSON(searchParams)
    const contentType = req.headers.get("content-type")

    const isContentTypeJson = contentType?.includes("application/json")
    const isContentTypeFormUrlEncoded = contentType?.includes(
      "application/x-www-form-urlencoded"
    )

    let jsonBody: any
    const bodyAsText = await req.text()

    if (bodyAsText.length > 0 && isContentTypeJson) {
      jsonBody = JSON.parse(bodyAsText)
    } else if (bodyAsText.length > 0 && isContentTypeFormUrlEncoded) {
      jsonBody = URLSearchParamsToJSON(new URLSearchParams(bodyAsText))
    }

    if (
      (req.method === "POST" || req.method === "PATCH") &&
      (input.jsonBody || input.commonParams) &&
      !isContentTypeJson &&
      !isEmpty(jsonBody)
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
      const original_combined_params = { ...queryParams, ...jsonBody }

      const willValidateRequestBody = input.shouldValidateGetRequestBody
        ? true
        : req.method !== "GET"

      const isFormData = Boolean(input.formData)

      if (isFormData && willValidateRequestBody) {
        ;(req as any).jsonBody = input.formData?.parse(jsonBody)
      }

      if (!isFormData && willValidateRequestBody) {
        ;(req as any).jsonBody = input.jsonBody?.parse(jsonBody)
      }

      if (input.queryParams) {
        validateQueryParams(
          queryParams,
          input.queryParams,
          supportedArrayFormats
        )

        ;(req as any).queryParams = parseQueryParams(
          input.queryParams,
          queryParams,
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

    return next(req, res)
  }
