import { z, ZodFirstPartyTypeKind } from "zod"

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


export const zodIssueToString = (issue: z.ZodIssue) => {
  if (issue.path.join(".") === "") {
    return issue.message
  }
  if (issue.message === "Required") {
    return `${issue.path.join(".")} is required`
  }
  return `${issue.message} for "${issue.path.join(".")}"`
}
