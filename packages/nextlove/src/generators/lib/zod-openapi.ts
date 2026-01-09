// @ts-nocheck - Vendored code with Zod 3/4 type incompatibilities (runtime works correctly)
/**
 * Zod OpenAPI Generator.
 *
 * Vendored from https://github.com/anatine/zod-plugins
 *
 * MIT License
 *
 * Copyright (c) 2022 Brian McBride
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type { SchemaObject, SchemaObjectType } from "openapi3-ts/oas31"
import merge from "ts-deepmerge"
import { z, ZodTypeAny } from "zod"
import { parseFrontMatter, testFrontMatter } from "./front-matter"
import dedent from "dedent"
import { prefixObjectKeysWithX } from "../utils/prefix-object-keys-with-x"
import { dashifyObjectKeys } from "../utils/dashify-object-keys"
import {
  getTypeName,
  getDef,
  getEffectsSchema,
  getEffect,
  getChecks,
  getInnerType,
  getEnumValues,
  getLiteralValue,
  getDefaultValue,
  getArrayConstraints,
  getRecordValueType,
  getCatchall,
  getUnknownKeys,
  getIntersectionParts,
  getUnionOptions,
  getDiscriminator,
  getBrandedType,
  getPipelineParts,
  getShape,
} from "../../lib/zod-compat"

// Type alias for Zod 3/4 compatibility
type AnyZodObject = z.ZodObject<any>

type AnatineSchemaObject = SchemaObject & { hideDefinitions?: string[] }

export interface OpenApiZodAny extends ZodTypeAny {
  metaOpenApi?: AnatineSchemaObject | AnatineSchemaObject[]
}

interface OpenApiZodAnyObject extends AnyZodObject {
  metaOpenApi?: AnatineSchemaObject | AnatineSchemaObject[]
}

interface ParsingArgs<T> {
  zodRef: T
  schemas: AnatineSchemaObject[]
  useOutput?: boolean
  hideDefinitions?: string[]
}

export function extendApi<T extends OpenApiZodAny>(
  schema: T,
  schemaObject: AnatineSchemaObject = {}
): T {
  schema.metaOpenApi = Object.assign(schema.metaOpenApi || {}, schemaObject)
  return schema
}

function iterateZodObject({
  zodRef,
  useOutput,
  hideDefinitions,
}: ParsingArgs<OpenApiZodAnyObject>) {
  // Get shape using the compat helper (works in both Zod 3 and 4)
  const shape = getShape(zodRef as ZodTypeAny) || {}
  const reduced = Object.keys(shape)
    .filter((key) => hideDefinitions?.includes(key) === false)
    .reduce(
      (carry, key) => ({
        ...carry,
        [key]: generateSchema(shape[key], useOutput),
      }),
      {} as Record<string, SchemaObject>
    )

  return reduced
}

function parseDescription(zodRef: OpenApiZodAny): SchemaObject {
  if (!zodRef.description) return {}
  const trimmedDescription = dedent(zodRef.description)
  if (!testFrontMatter(trimmedDescription))
    return { description: zodRef.description }
  const { attributes, body } = parseFrontMatter(trimmedDescription)
  const output: SchemaObject = {}
  if (body.trim()) output.description = body.trim()
  if (typeof attributes === "object" && attributes !== null) {
    if ("deprecated" in attributes && attributes.deprecated) {
      output.deprecated = true
    }

    Object.entries(
      prefixObjectKeysWithX(dashifyObjectKeys(attributes))
    ).forEach(([key, value]) => {
      output[key] = value
    })
  }

  return output
}

function parseTransformation({
  zodRef,
  schemas,
  useOutput,
}: ParsingArgs<any>): SchemaObject {
  const innerSchema = getEffectsSchema(zodRef)
  const input = innerSchema ? generateSchema(innerSchema, useOutput) : {}

  let output = "undefined"
  const effect = getEffect(zodRef)
  if (useOutput && effect) {
    const transformEffect = effect.type === "transform" ? effect : null
    if (transformEffect && "transform" in transformEffect) {
      try {
        output = typeof transformEffect.transform(
          ["integer", "number"].includes(`${input.type}`)
            ? 0
            : "string" === input.type
            ? ""
            : "boolean" === input.type
            ? false
            : "object" === input.type
            ? {}
            : "null" === input.type
            ? null
            : "array" === input.type
            ? []
            : undefined,
          { addIssue: () => undefined, path: [] } // TODO: Discover if context is necessary here
        )
      } catch (e) {
        /**/
      }
    }
  }
  return merge(
    {
      ...(zodRef.description ? { description: zodRef.description } : {}),
      ...input,
      ...(["number", "string", "boolean", "null"].includes(output)
        ? {
            type: output as "number" | "string" | "boolean" | "null",
          }
        : {}),
    },
    ...schemas
  )
}

function parseString({
  zodRef,
  schemas,
}: ParsingArgs<z.ZodString>): SchemaObject {
  const baseSchema: SchemaObject = {
    type: "string",
  }
  const checks = getChecks(zodRef)
  checks.forEach((item) => {
    switch (item.kind) {
      case "email":
        baseSchema.format = "email"
        break
      case "uuid":
        baseSchema.format = "uuid"
        break
      case "cuid":
        baseSchema.format = "cuid"
        break
      case "url":
        baseSchema.format = "uri"
        break
      case "datetime":
        baseSchema.format = "date-time"
        break
      case "length":
        baseSchema.minLength = item.value
        baseSchema.maxLength = item.value
        break
      case "max":
        baseSchema.maxLength = item.value
        break
      case "min":
        baseSchema.minLength = item.value
        break
      case "regex":
        baseSchema.pattern = item.regex.source
        break
    }
  })
  return merge(baseSchema, parseDescription(zodRef), ...schemas)
}

function parseNumber({
  zodRef,
  schemas,
}: ParsingArgs<z.ZodNumber>): SchemaObject {
  const baseSchema: SchemaObject = {
    type: "number",
    format: "float",
  }
  const checks = getChecks(zodRef)
  checks.forEach((item) => {
    switch (item.kind) {
      case "max":
        baseSchema.maximum = item.value
        // @ts-expect-error UPSTREAM: The openapi3-ts types are wrong: exclusiveMaximum is a boolean in this version.
        // https://swagger.io/docs/specification/v3_0/data-models/data-types/
        if (!item.inclusive) baseSchema.exclusiveMaximum = true
        break
      case "min":
        baseSchema.minimum = item.value
        // @ts-expect-error UPSTREAM: The openapi3-ts types are wrong: exclusiveMinimum is a boolean in this version.
        // https://swagger.io/docs/specification/v3_0/data-models/data-types/
        if (!item.inclusive) baseSchema.exclusiveMinimum = true
        break
      case "int":
        baseSchema.type = "integer"
        delete baseSchema.format
        break
      case "multipleOf":
        baseSchema.multipleOf = item.value
    }
  })
  return merge(baseSchema, parseDescription(zodRef), ...schemas)
}

function getExcludedDefinitionsFromSchema(
  schemas: AnatineSchemaObject[]
): string[] {
  const excludedDefinitions: string[] = []
  for (const schema of schemas) {
    if (Array.isArray(schema.hideDefinitions)) {
      excludedDefinitions.push(...schema.hideDefinitions)
    }
  }

  return excludedDefinitions
}

function parseObject({
  zodRef,
  schemas,
  useOutput,
  hideDefinitions,
}: ParsingArgs<
  z.ZodObject<never, "passthrough" | "strict" | "strip">
>): SchemaObject {
  let additionalProperties: SchemaObject["additionalProperties"]

  const catchall = getCatchall(zodRef)
  const unknownKeys = getUnknownKeys(zodRef)

  // `catchall` obviates `strict`, `strip`, and `passthrough`
  if (
    !(
      catchall instanceof z.ZodNever ||
      (catchall && getTypeName(catchall) === "ZodNever")
    )
  ) {
    if (catchall) {
      additionalProperties = generateSchema(catchall, useOutput)
    }
  } else if (unknownKeys === "passthrough") {
    additionalProperties = true
  } else if (unknownKeys === "strict") {
    additionalProperties = false
  }

  // So that `undefined` values don't end up in the schema and be weird
  additionalProperties =
    additionalProperties != null ? { additionalProperties } : {}

  const objectShape = getShape(zodRef as ZodTypeAny) || {}
  const requiredProperties = Object.keys(objectShape).filter((key) => {
    const item = objectShape[key]
    const itemTypeName = getTypeName(item)
    return (
      !(
        item.isOptional() ||
        item instanceof z.ZodDefault ||
        itemTypeName === "ZodDefault"
      ) && !(item instanceof z.ZodNever || itemTypeName === "ZodDefault")
    )
  })

  const required =
    requiredProperties.length > 0 ? { required: requiredProperties } : {}

  return merge(
    {
      type: "object" as SchemaObjectType,
      properties: iterateZodObject({
        zodRef: zodRef as OpenApiZodAnyObject,
        schemas,
        useOutput,
        hideDefinitions: getExcludedDefinitionsFromSchema(schemas),
      }),
      ...required,
      ...additionalProperties,
      ...hideDefinitions,
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseRecord({
  zodRef,
  schemas,
  useOutput,
}: ParsingArgs<z.ZodRecord>): SchemaObject {
  const valueType = getRecordValueType(zodRef)
  return merge(
    {
      type: "object" as SchemaObjectType,
      additionalProperties:
        valueType instanceof z.ZodUnknown
          ? {}
          : valueType
          ? generateSchema(valueType, useOutput)
          : {},
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseBigInt({
  zodRef,
  schemas,
}: ParsingArgs<z.ZodBigInt>): SchemaObject {
  return merge(
    { type: "integer" as SchemaObjectType, format: "int64" },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseBoolean({
  zodRef,
  schemas,
}: ParsingArgs<z.ZodBoolean>): SchemaObject {
  return merge(
    { type: "boolean" as SchemaObjectType },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseDate({ zodRef, schemas }: ParsingArgs<z.ZodDate>): SchemaObject {
  return merge(
    { type: "string" as SchemaObjectType, format: "date-time" },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseNull({ zodRef, schemas }: ParsingArgs<z.ZodNull>): SchemaObject {
  return merge(
    {
      nullable: true,
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseOptional({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<z.ZodOptional<OpenApiZodAny>>): SchemaObject {
  return merge(
    generateSchema(zodRef.unwrap(), useOutput),
    parseDescription(zodRef),
    ...schemas
  )
}

function parseNullable({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<z.ZodNullable<OpenApiZodAny>>): SchemaObject {
  const schema = generateSchema(zodRef.unwrap(), useOutput)
  return merge(
    { ...schema, type: schema.type, nullable: true },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseDefault({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<z.ZodDefault<OpenApiZodAny>>): SchemaObject {
  const innerType = getInnerType(zodRef)
  return merge(
    {
      default: getDefaultValue(zodRef),
      ...(innerType ? generateSchema(innerType, useOutput) : {}),
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseArray({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<z.ZodArray<OpenApiZodAny>>): SchemaObject {
  const constraints: SchemaObject = {}
  const { exactLength, minLength, maxLength } = getArrayConstraints(zodRef)

  if (exactLength != null) {
    constraints.minItems = exactLength.value
    constraints.maxItems = exactLength.value
  }

  if (minLength != null) constraints.minItems = minLength.value
  if (maxLength != null) constraints.maxItems = maxLength.value

  return merge(
    {
      type: "array" as SchemaObjectType,
      items: generateSchema(zodRef.element, useOutput),
      ...constraints,
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseLiteral({ schemas, zodRef }: ParsingArgs<any>): SchemaObject {
  const value = getLiteralValue(zodRef)
  return merge(
    {
      type: typeof value as "string" | "number" | "boolean",
      enum: [value],
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseEnum({ schemas, zodRef }: ParsingArgs<any>): SchemaObject {
  const values = getEnumValues(zodRef)
  const valuesArray = Array.isArray(values) ? values : Object.values(values)
  return merge(
    {
      type: typeof valuesArray[0] as "string" | "number",
      enum: valuesArray,
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseIntersection({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>>): SchemaObject {
  const { left, right } = getIntersectionParts(zodRef)
  return merge(
    {
      allOf: [
        left ? generateSchema(left, useOutput) : {},
        right ? generateSchema(right, useOutput) : {},
      ],
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseUnion({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<any>): SchemaObject {
  const contents = getUnionOptions(zodRef)
  if (
    contents.reduce(
      (prev, content) => prev && getTypeName(content) === "ZodLiteral",
      true
    )
  ) {
    // special case to transform unions of literals into enums
    const literals = contents as unknown as z.ZodLiteral<OpenApiZodAny>[]
    const type = literals.reduce((prev, content) => {
      const value = getLiteralValue(content)
      return !prev || prev === typeof value ? typeof value : null
    }, null as null | string)

    if (type) {
      return merge(
        {
          type: type as "string" | "number" | "boolean",
          enum: literals.map((literal) => getLiteralValue(literal)),
        },
        parseDescription(zodRef),
        ...schemas
      )
    }
  }

  const isNullable = contents.some(
    (content) => getTypeName(content) === "ZodNull"
  )
  const nonNullContents = contents.filter(
    (content) => getTypeName(content) !== "ZodNull"
  )

  return merge(
    {
      oneOf: nonNullContents.map((schema) => generateSchema(schema, useOutput)),
      ...(isNullable ? { nullable: true } : {}),
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseDiscriminatedUnion({
  schemas,
  zodRef,
  useOutput,
}: ParsingArgs<any>): SchemaObject {
  const discriminator = getDiscriminator(zodRef)
  const options = getUnionOptions(zodRef)
  return merge(
    {
      discriminator: {
        propertyName: discriminator,
      },
      oneOf: options.map((schema) => generateSchema(schema, useOutput)),
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseNever({
  zodRef,
  schemas,
}: ParsingArgs<z.ZodNever>): SchemaObject {
  return merge({ readOnly: true }, parseDescription(zodRef), ...schemas)
}

function parseBranded({ schemas, zodRef }: ParsingArgs<any>): SchemaObject {
  const type = getBrandedType(zodRef)
  return merge(type ? generateSchema(type) : {}, ...schemas)
}

function catchAllParser({
  zodRef,
  schemas,
}: ParsingArgs<ZodTypeAny>): SchemaObject {
  return merge(parseDescription(zodRef), ...schemas)
}

function parsePipeline({ zodRef, useOutput }: ParsingArgs<any>): SchemaObject {
  const { in: inSchema, out: outSchema } = getPipelineParts(zodRef)
  if (useOutput && outSchema) {
    return generateSchema(outSchema, useOutput)
  }
  return inSchema ? generateSchema(inSchema, useOutput) : {}
}

function parseReadonly({
  zodRef,
  useOutput,
  schemas,
}: ParsingArgs<any>): SchemaObject {
  const innerType = getInnerType(zodRef)
  return merge(
    innerType ? generateSchema(innerType, useOutput) : {},
    parseDescription(zodRef),
    ...schemas
  )
}

const workerMap = {
  ZodObject: parseObject,
  ZodRecord: parseRecord,
  ZodString: parseString,
  ZodNumber: parseNumber,
  ZodBigInt: parseBigInt,
  ZodBoolean: parseBoolean,
  ZodDate: parseDate,
  ZodNull: parseNull,
  ZodOptional: parseOptional,
  ZodNullable: parseNullable,
  ZodDefault: parseDefault,
  ZodArray: parseArray,
  ZodLiteral: parseLiteral,
  ZodEnum: parseEnum,
  ZodNativeEnum: parseEnum,
  ZodTransformer: parseTransformation,
  ZodEffects: parseTransformation,
  ZodIntersection: parseIntersection,
  ZodUnion: parseUnion,
  ZodDiscriminatedUnion: parseDiscriminatedUnion,
  ZodNever: parseNever,
  ZodBranded: parseBranded,
  // TODO Transform the rest to schemas
  ZodUndefined: catchAllParser,
  // TODO: `prefixItems` is allowed in OpenAPI 3.1 which can be used to create tuples
  ZodTuple: catchAllParser,
  ZodMap: catchAllParser,
  ZodFunction: catchAllParser,
  ZodLazy: catchAllParser,
  ZodPromise: catchAllParser,
  ZodAny: catchAllParser,
  ZodUnknown: catchAllParser,
  ZodVoid: catchAllParser,
  ZodPipeline: parsePipeline,
  ZodReadonly: parseReadonly,
}
type WorkerKeys = keyof typeof workerMap

export function generateSchema(
  zodRef: OpenApiZodAny,
  useOutput?: boolean
): SchemaObject {
  const { metaOpenApi = {} } = zodRef
  const schemas: AnatineSchemaObject[] = [
    ...(Array.isArray(metaOpenApi) ? metaOpenApi : [metaOpenApi]),
  ]
  try {
    const typeName = getTypeName(zodRef) as WorkerKeys
    if (typeName in workerMap) {
      return workerMap[typeName]({
        zodRef: zodRef as never,
        schemas,
        useOutput,
      })
    }

    return catchAllParser({ zodRef, schemas })
  } catch (err) {
    console.error(err)
    return catchAllParser({ zodRef, schemas })
  }
}
