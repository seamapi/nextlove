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
import { AnyZodObject, z, ZodTypeAny } from "zod"
import { parseFrontMatter, testFrontMatter } from "./front-matter"
import dedent from "dedent"
import { prefixObjectKeysWithX } from "../utils/prefix-object-keys-with-x"
import { dashifyObjectKeys } from "../utils/dashify-object-keys"

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
  const reduced = Object.keys(zodRef.shape)
    .filter((key) => hideDefinitions?.includes(key) === false)
    .reduce(
      (carry, key) => ({
        ...carry,
        [key]: generateSchema(zodRef.shape[key], useOutput),
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
}: ParsingArgs<z.ZodTransformer<never> | z.ZodEffects<never>>): SchemaObject {
  const input = generateSchema(zodRef._def.schema, useOutput)

  let output = "undefined"
  if (useOutput && zodRef._def.effect) {
    const effect =
      zodRef._def.effect.type === "transform" ? zodRef._def.effect : null
    if (effect && "transform" in effect) {
      try {
        output = typeof effect.transform(
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
  const { checks = [] } = zodRef._def
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
  const { checks = [] } = zodRef._def
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

  // `catchall` obviates `strict`, `strip`, and `passthrough`
  if (
    !(
      zodRef._def.catchall instanceof z.ZodNever ||
      zodRef._def.catchall?._def.typeName === "ZodNever"
    )
  )
    additionalProperties = generateSchema(zodRef._def.catchall, useOutput)
  else if (zodRef._def.unknownKeys === "passthrough")
    additionalProperties = true
  else if (zodRef._def.unknownKeys === "strict") additionalProperties = false

  // So that `undefined` values don't end up in the schema and be weird
  additionalProperties =
    additionalProperties != null ? { additionalProperties } : {}

  const requiredProperties = Object.keys(
    (zodRef as z.AnyZodObject).shape
  ).filter((key) => {
    const item = (zodRef as z.AnyZodObject).shape[key]
    return (
      !(
        item.isOptional() ||
        item instanceof z.ZodDefault ||
        item._def.typeName === "ZodDefault"
      ) && !(item instanceof z.ZodNever || item._def.typeName === "ZodDefault")
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
  return merge(
    {
      type: "object" as SchemaObjectType,
      additionalProperties:
        zodRef._def.valueType instanceof z.ZodUnknown
          ? {}
          : generateSchema(zodRef._def.valueType, useOutput),
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
  return merge(
    {
      default: zodRef._def.defaultValue(),
      ...generateSchema(zodRef._def.innerType, useOutput),
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
  if (zodRef._def.exactLength != null) {
    constraints.minItems = zodRef._def.exactLength.value
    constraints.maxItems = zodRef._def.exactLength.value
  }

  if (zodRef._def.minLength != null)
    constraints.minItems = zodRef._def.minLength.value
  if (zodRef._def.maxLength != null)
    constraints.maxItems = zodRef._def.maxLength.value

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

function parseLiteral({
  schemas,
  zodRef,
}: ParsingArgs<z.ZodLiteral<OpenApiZodAny>>): SchemaObject {
  return merge(
    {
      type: typeof zodRef._def.value as "string" | "number" | "boolean",
      enum: [zodRef._def.value],
    },
    parseDescription(zodRef),
    ...schemas
  )
}

function parseEnum({
  schemas,
  zodRef,
}: ParsingArgs<z.ZodEnum<never> | z.ZodNativeEnum<never>>): SchemaObject {
  return merge(
    {
      type: typeof Object.values(zodRef._def.values)[0] as "string" | "number",
      enum: Object.values(zodRef._def.values),
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
  return merge(
    {
      allOf: [
        generateSchema(zodRef._def.left, useOutput),
        generateSchema(zodRef._def.right, useOutput),
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
}: ParsingArgs<z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>>): SchemaObject {
  const contents = zodRef._def.options
  if (
    contents.reduce(
      (prev, content) => prev && content._def.typeName === "ZodLiteral",
      true
    )
  ) {
    // special case to transform unions of literals into enums
    const literals = contents as unknown as z.ZodLiteral<OpenApiZodAny>[]
    const type = literals.reduce(
      (prev, content) =>
        !prev || prev === typeof content._def.value
          ? typeof content._def.value
          : null,
      null as null | string
    )

    if (type) {
      return merge(
        {
          type: type as "string" | "number" | "boolean",
          enum: literals.map((literal) => literal._def.value),
        },
        parseDescription(zodRef),
        ...schemas
      )
    }
  }

  const isNullable = contents.some(
    (content) => content._def.typeName === "ZodNull"
  )
  const nonNullContents = contents.filter(
    (content) => content._def.typeName !== "ZodNull"
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
}: ParsingArgs<
  z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>
>): SchemaObject {
  return merge(
    {
      discriminator: {
        propertyName: (
          zodRef as z.ZodDiscriminatedUnion<
            string,
            z.ZodDiscriminatedUnionOption<string>[]
          >
        )._def.discriminator,
      },
      oneOf: Array.from(
        (
          zodRef as z.ZodDiscriminatedUnion<
            string,
            z.ZodDiscriminatedUnionOption<string>[]
          >
        )._def.options.values()
      ).map((schema) => generateSchema(schema, useOutput)),
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

function parseBranded({
  schemas,
  zodRef,
}: ParsingArgs<z.ZodBranded<z.ZodAny, string>>): SchemaObject {
  return merge(generateSchema(zodRef._def.type), ...schemas)
}

function catchAllParser({
  zodRef,
  schemas,
}: ParsingArgs<ZodTypeAny>): SchemaObject {
  return merge(parseDescription(zodRef), ...schemas)
}

function parsePipeline({
  zodRef,
  useOutput,
}: ParsingArgs<z.ZodPipeline<never, never>>): SchemaObject {
  if (useOutput) {
    return generateSchema(zodRef._def.out, useOutput)
  }
  return generateSchema(zodRef._def.in, useOutput)
}

function parseReadonly({
  zodRef,
  useOutput,
  schemas,
}: ParsingArgs<z.ZodReadonly<z.ZodAny>>): SchemaObject {
  return merge(
    generateSchema(zodRef._def.innerType, useOutput),
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
    const typeName = zodRef._def.typeName as WorkerKeys
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
