/**
 * Zod Compatibility Layer
 *
 * This module provides compatibility between Zod v3 and Zod v4.
 * In Zod v4, the internal structure changed:
 * - `._def` moved to `._zod.def`
 * - `._def.typeName` moved to `._zod.def.type`
 *
 * This module abstracts these differences to support both versions.
 */

import { ZodTypeAny } from "zod"

/**
 * Check if we're using Zod v4+
 */
export function isZodV4(schema: ZodTypeAny): boolean {
  return "_zod" in schema
}

/**
 * Get the internal definition object from a Zod schema.
 * Works with both Zod v3 (._def) and Zod v4 (._zod.def)
 */
export function getDef(schema: ZodTypeAny): any {
  if ("_zod" in schema) {
    // Zod v4
    return (schema as any)._zod.def
  }
  // Zod v3
  return (schema as any)._def
}

/**
 * Get the type name of a Zod schema.
 * Zod v3: schema._def.typeName (e.g., "ZodString")
 * Zod v4: schema._zod.def.type (e.g., "string") - but we normalize to v3-style names
 */
export function getTypeName(schema: ZodTypeAny): string {
  if ("_zod" in schema) {
    // Zod v4 - the type is stored differently
    const zod = (schema as any)._zod
    // In Zod v4, the constructor name gives us the type
    const constructorName = schema.constructor.name
    if (constructorName && constructorName.startsWith("$Zod")) {
      // Zod v4 uses $ZodString, $ZodNumber, etc - convert to ZodString, ZodNumber
      return constructorName.slice(1)
    }
    // Fallback to def.type if available
    if (zod.def && zod.def.type) {
      return normalizeZodV4Type(zod.def.type)
    }
    return constructorName || "Unknown"
  }
  // Zod v3
  return (schema as any)._def?.typeName || "Unknown"
}

/**
 * Normalize Zod v4 type names to v3-style names for consistency
 */
function normalizeZodV4Type(type: string): string {
  const typeMap: Record<string, string> = {
    string: "ZodString",
    number: "ZodNumber",
    bigint: "ZodBigInt",
    boolean: "ZodBoolean",
    date: "ZodDate",
    undefined: "ZodUndefined",
    null: "ZodNull",
    void: "ZodVoid",
    any: "ZodAny",
    unknown: "ZodUnknown",
    never: "ZodNever",
    literal: "ZodLiteral",
    enum: "ZodEnum",
    nativeEnum: "ZodNativeEnum",
    object: "ZodObject",
    array: "ZodArray",
    tuple: "ZodTuple",
    union: "ZodUnion",
    discriminatedUnion: "ZodDiscriminatedUnion",
    intersection: "ZodIntersection",
    record: "ZodRecord",
    map: "ZodMap",
    set: "ZodSet",
    function: "ZodFunction",
    lazy: "ZodLazy",
    promise: "ZodPromise",
    optional: "ZodOptional",
    nullable: "ZodNullable",
    default: "ZodDefault",
    effects: "ZodEffects",
    transformer: "ZodTransformer",
    branded: "ZodBranded",
    pipeline: "ZodPipeline",
    readonly: "ZodReadonly",
  }
  return typeMap[type] || `Zod${type.charAt(0).toUpperCase() + type.slice(1)}`
}

/**
 * Get the inner schema from a ZodEffects/ZodTransformer
 */
export function getEffectsSchema(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.schema
}

/**
 * Get the inner type from ZodOptional, ZodNullable, ZodDefault, etc.
 */
export function getInnerType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.innerType
}

/**
 * Get the shape of a ZodObject
 */
export function getShape(
  schema: ZodTypeAny
): Record<string, ZodTypeAny> | undefined {
  const def = getDef(schema)
  if (typeof def?.shape === "function") {
    return def.shape()
  }
  return def?.shape
}

/**
 * Get the checks array from a string/number schema
 */
export function getChecks(schema: ZodTypeAny): any[] {
  const def = getDef(schema)
  return def?.checks || []
}

/**
 * Get values from a ZodEnum or ZodNativeEnum
 */
export function getEnumValues(
  schema: ZodTypeAny
): any[] | Record<string, any> | undefined {
  // Zod 4: use schema.options (array) or schema.enum (object)
  if ("options" in schema && Array.isArray((schema as any).options)) {
    return (schema as any).options
  }
  if ("enum" in schema && (schema as any).enum) {
    return (schema as any).enum
  }
  // Zod 3 fallback
  const def = getDef(schema)
  // Zod 4 also has entries in def
  return def?.values || def?.entries
}

/**
 * Get the literal value from a ZodLiteral
 */
export function getLiteralValue(schema: ZodTypeAny): any {
  const def = getDef(schema)
  return def?.value
}

/**
 * Get the default value from a ZodDefault
 */
export function getDefaultValue(schema: ZodTypeAny): any {
  const def = getDef(schema)
  if (typeof def?.defaultValue === "function") {
    return def.defaultValue()
  }
  return def?.defaultValue
}

/**
 * Get array constraints
 */
export function getArrayConstraints(schema: ZodTypeAny): {
  exactLength?: { value: number }
  minLength?: { value: number }
  maxLength?: { value: number }
} {
  const def = getDef(schema)
  return {
    exactLength: def?.exactLength,
    minLength: def?.minLength,
    maxLength: def?.maxLength,
  }
}

/**
 * Get the element type from a ZodArray
 */
export function getArrayType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.type
}

/**
 * Get the value type from a ZodRecord
 */
export function getRecordValueType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.valueType
}

/**
 * Get catchall from ZodObject
 */
export function getCatchall(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.catchall
}

/**
 * Get unknownKeys from ZodObject
 */
export function getUnknownKeys(
  schema: ZodTypeAny
): "passthrough" | "strict" | "strip" | undefined {
  const def = getDef(schema)
  return def?.unknownKeys
}

/**
 * Get left/right from ZodIntersection
 */
export function getIntersectionParts(schema: ZodTypeAny): {
  left?: ZodTypeAny
  right?: ZodTypeAny
} {
  const def = getDef(schema)
  return {
    left: def?.left,
    right: def?.right,
  }
}

/**
 * Get options from ZodUnion or ZodDiscriminatedUnion
 */
export function getUnionOptions(schema: ZodTypeAny): ZodTypeAny[] {
  const def = getDef(schema)
  const options = def?.options
  if (options instanceof Map) {
    return Array.from(options.values())
  }
  if (Array.isArray(options)) {
    return options
  }
  return []
}

/**
 * Get discriminator from ZodDiscriminatedUnion
 */
export function getDiscriminator(schema: ZodTypeAny): string | undefined {
  const def = getDef(schema)
  return def?.discriminator
}

/**
 * Get effect from ZodEffects
 */
export function getEffect(schema: ZodTypeAny): any {
  const def = getDef(schema)
  return def?.effect
}

/**
 * Get pipeline in/out from ZodPipeline
 */
export function getPipelineParts(schema: ZodTypeAny): {
  in?: ZodTypeAny
  out?: ZodTypeAny
} {
  const def = getDef(schema)
  return {
    in: def?.in,
    out: def?.out,
  }
}

/**
 * Get the branded type from ZodBranded
 */
export function getBrandedType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.type
}

/**
 * Get tuple items
 */
export function getTupleItems(schema: ZodTypeAny): ZodTypeAny[] {
  const def = getDef(schema)
  return def?.items || []
}

/**
 * Get function args and returns
 */
export function getFunctionParts(schema: ZodTypeAny): {
  args?: ZodTypeAny
  returns?: ZodTypeAny
} {
  const def = getDef(schema)
  return {
    args: def?.args,
    returns: def?.returns,
  }
}

/**
 * Get map key and value types
 */
export function getMapTypes(schema: ZodTypeAny): {
  keyType?: ZodTypeAny
  valueType?: ZodTypeAny
} {
  const def = getDef(schema)
  return {
    keyType: def?.keyType,
    valueType: def?.valueType,
  }
}

/**
 * Get set value type
 */
export function getSetValueType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.valueType
}

/**
 * Get promise type
 */
export function getPromiseType(schema: ZodTypeAny): ZodTypeAny | undefined {
  const def = getDef(schema)
  return def?.type
}

/**
 * Get the custom type getter if available
 */
export function getCustomTypeGetter(schema: ZodTypeAny): any {
  const def = getDef(schema)
  return def?.getType
}
