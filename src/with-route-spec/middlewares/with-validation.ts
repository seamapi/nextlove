import type { NextApiRequest, NextApiResponse } from "next"
import { z } from "zod"
import _ from "lodash"

import {
  BadRequestException,
  InternalServerErrorException,
} from "../../nextjs-exception-middleware"
import { QueryArrayFormats } from "../../types"
import { DEFAULT_ARRAY_FORMATS } from ".."
import {
  getTypeName,
  getEffectsSchema,
  getInnerType,
} from "../../lib/zod-compat"

const getZodObjectSchemaFromZodEffectSchema = (
  isZodEffect: boolean,
  schema: z.ZodTypeAny
): z.ZodTypeAny | z.ZodObject<any> => {
  if (!isZodEffect) {
    return schema as z.ZodObject<any>
  }

  let currentSchema = schema

  while (getTypeName(currentSchema) === "ZodEffects") {
    const innerSchema = getEffectsSchema(currentSchema)
    if (!innerSchema) break
    currentSchema = innerSchema
  }

  return currentSchema as z.ZodObject<any>
}

const tryGetZodSchemaAsObject = (
  schema: z.ZodTypeAny
): z.ZodObject<any> | undefined => {
  const isZodEffect = getTypeName(schema) === "ZodEffects"
  const safe_schema = getZodObjectSchemaFromZodEffectSchema(isZodEffect, schema)
  const isZodObject = getTypeName(safe_schema) === "ZodObject"

  if (!isZodObject) {
    return undefined
  }

  return safe_schema as z.ZodObject<any>
}

const unwrapZodSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  const special_zod_types = ["ZodOptional", "ZodDefault", "ZodEffects"]

  while (special_zod_types.includes(getTypeName(schema))) {
    const typeName = getTypeName(schema)
    if (typeName === "ZodOptional" || typeName === "ZodDefault") {
      const inner = getInnerType(schema)
      if (!inner) break
      schema = inner
      continue
    }

    if (typeName === "ZodEffects") {
      const inner = getEffectsSchema(schema)
      if (!inner) break
      schema = inner
      continue
    }
  }
  return schema
}

const isZodSchemaArray = (schema: z.ZodTypeAny) => {
  const unwrapped = unwrapZodSchema(schema)
  return getTypeName(unwrapped) === "ZodArray"
}

const isZodSchemaBoolean = (schema: z.ZodTypeAny) => {
  const unwrapped = unwrapZodSchema(schema)
  return getTypeName(unwrapped) === "ZodBoolean"
}

const parseQueryParams = (
  schema: z.ZodTypeAny,
  input: Record<string, unknown>,
  supportedArrayFormats: QueryArrayFormats
) => {
  const parsed_input = Object.assign({}, input)
  const obj_schema = tryGetZodSchemaAsObject(schema)

  if (obj_schema) {
    for (const [key, value] of Object.entries(obj_schema.shape)) {
      if (isZodSchemaArray(value as z.ZodTypeAny)) {
        const array_input = input[key]

        if (typeof array_input === "string" && array_input.length === 0) {
          parsed_input[key] = []
        }

        if (
          typeof array_input === "string" &&
          array_input.length > 0 &&
          supportedArrayFormats.includes("comma")
        ) {
          parsed_input[key] = array_input.split(",")
        }

        const bracket_syntax_array_input = input[`${key}[]`]
        if (
          typeof bracket_syntax_array_input === "string" &&
          supportedArrayFormats.includes("brackets")
        ) {
          const pre_split_array = bracket_syntax_array_input
          parsed_input[key] = pre_split_array.split(",")
        }

        if (
          Array.isArray(bracket_syntax_array_input) &&
          supportedArrayFormats.includes("brackets")
        ) {
          parsed_input[key] = bracket_syntax_array_input
        }

        continue
      }

      if (isZodSchemaBoolean(value as z.ZodTypeAny)) {
        const boolean_input = input[key]

        if (typeof boolean_input === "string") {
          parsed_input[key] = boolean_input === "true"
        }
      }
    }
  }

  return schema.parse(parsed_input)
}

const validateQueryParams = (
  inputUrl: string,
  schema: z.ZodTypeAny,
  supportedArrayFormats: QueryArrayFormats
) => {
  const url = new URL(inputUrl, "http://dummy.com")

  const seenKeys = new Set<string>()

  const obj_schema = tryGetZodSchemaAsObject(schema)
  if (!obj_schema) {
    return
  }

  for (const key of url.searchParams.keys()) {
    for (const [schemaKey, value] of Object.entries(obj_schema.shape)) {
      if (isZodSchemaArray(value as z.ZodTypeAny)) {
        if (
          key === `${schemaKey}[]` &&
          !supportedArrayFormats.includes("brackets")
        ) {
          throw new BadRequestException({
            type: "invalid_query_params",
            message: `Bracket syntax not supported for query param "${schemaKey}"`,
          })
        }
      }
    }

    const key_schema = obj_schema.shape[key]

    if (key_schema) {
      if (isZodSchemaArray(key_schema)) {
        if (seenKeys.has(key) && !supportedArrayFormats.includes("repeat")) {
          throw new BadRequestException({
            type: "invalid_query_params",
            message: `Repeated parameters not supported for duplicate query param "${key}"`,
          })
        }
      }
    }

    seenKeys.add(key)
  }
}

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
        : req.method !== "GET" && req.method !== "DELETE"

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
        ) as typeof req.query
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

export default withValidation
