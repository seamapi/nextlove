import { z, ZodFirstPartyTypeKind } from "zod"
import { BadRequestException } from "./http-exceptions"
import { QueryArrayFormats } from "./types"

export const getZodObjectSchemaFromZodEffectSchema = (
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
export const getZodDefFromZodSchemaHelpers = (schema: z.ZodTypeAny) => {
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

export const parseQueryParams = (
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

        if (
          typeof array_input === "string" &&
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

export const zodIssueToString = (issue: z.ZodIssue) => {
  if (issue.path.join(".") === "") {
    return issue.message
  }
  if (issue.message === "Required") {
    return `${issue.path.join(".")} is required`
  }
  return `${issue.message} for "${issue.path.join(".")}"`
}

export const tryGetZodSchemaAsObject = (
  schema: z.ZodTypeAny
): z.ZodObject<any> | undefined => {
  const isZodEffect = schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
  const safe_schema = getZodObjectSchemaFromZodEffectSchema(isZodEffect, schema)
  const isZodObject =
    safe_schema._def.typeName === ZodFirstPartyTypeKind.ZodObject

  if (!isZodObject) {
    return undefined
  }

  return safe_schema as z.ZodObject<any>
}

export const validateQueryParams = (
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

export const isZodSchemaArray = (schema: z.ZodTypeAny) => {
  const def = getZodDefFromZodSchemaHelpers(schema)
  return def.typeName === ZodFirstPartyTypeKind.ZodArray
}

export const isZodSchemaBoolean = (schema: z.ZodTypeAny) => {
  const def = getZodDefFromZodSchemaHelpers(schema)
  return def.typeName === ZodFirstPartyTypeKind.ZodBoolean
}
