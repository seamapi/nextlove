import type { NextApiRequest, NextApiResponse } from "next"
import { z, ZodFirstPartyTypeKind } from "zod"
import {
  BadRequestException,
  InternalServerErrorException,
} from "nextjs-exception-middleware"
import { isEmpty } from "lodash"

const getZodObjectSchemaFromZodEffectSchema = (
  isZodEffect: boolean,
  schema: z.ZodTypeAny
): z.ZodTypeAny | z.ZodObject<any> => {
  if (!isZodEffect) {
    return schema as z.ZodObject<any>
  }

  let currentSchema = schema

  while (currentSchema instanceof z.ZodEffects) {
    currentSchema = currentSchema._def.schema
  }

  return currentSchema as z.ZodObject<any>
}

/**
 * This function is used to get the correct schema from a ZodEffect | ZodDefault | ZodOptional schema.
 * TODO: this function should handle all special cases of ZodSchema and not just ZodEffect | ZodDefault | ZodOptional
 */
const getZodDefFromZodSchemaHelpers = (schema: z.ZodTypeAny) => {
  const special_zod_types = [
    ZodFirstPartyTypeKind.ZodOptional,
    ZodFirstPartyTypeKind.ZodDefault,
    ZodFirstPartyTypeKind.ZodEffects,
  ]

  while (special_zod_types.includes(schema._def.typeName)) {
    if (
      schema._def.typeName === ZodFirstPartyTypeKind.ZodOptional ||
      schema._def.typeName === ZodFirstPartyTypeKind.ZodDefault
    ) {
      schema = schema._def.innerType
      continue
    }

    if (schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects) {
      schema = schema._def.schema
      continue
    }
  }
  return schema._def
}

const parseQueryParams = (
  schema: z.ZodTypeAny,
  input: Record<string, unknown>
) => {
  const parsed_input = Object.assign({}, input)
  const isZodEffect = schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
  const safe_schema = getZodObjectSchemaFromZodEffectSchema(isZodEffect, schema)
  const isZodObject =
    safe_schema._def.typeName === ZodFirstPartyTypeKind.ZodObject

  if (isZodObject) {
    const obj_schema = safe_schema as z.ZodObject<any>

    for (const [key, value] of Object.entries(obj_schema.shape)) {
      const def = getZodDefFromZodSchemaHelpers(value as z.ZodTypeAny)
      const isArray = def.typeName === ZodFirstPartyTypeKind.ZodArray
      if (isArray) {
        const array_input = input[key]

        if (typeof array_input === "string") {
          parsed_input[key] = array_input.split(",")
        }

        if (Array.isArray(input[`${key}[]`])) {
          parsed_input[key] = input[`${key}[]`]
        }

        continue
      }

      const isBoolean = def.typeName === ZodFirstPartyTypeKind.ZodBoolean
      if (isBoolean) {
        const boolean_input = input[key]

        if (typeof boolean_input === "string") {
          parsed_input[key] = boolean_input === "true"
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
        req.query = parseQueryParams(input.queryParams, req.query)
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
      validateJsonResponse(input.jsonResponse, res)
    }

    return next(req, res)
  }

export default withValidation
