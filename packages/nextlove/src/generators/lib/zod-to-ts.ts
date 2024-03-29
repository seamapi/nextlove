/**
 * Zod To TS
 *
 * Vendored from https://github.com/sachinraja/zod-to-ts
 *
 * MIT License
 *
 * Copyright (c) 2021 Sachin Raja
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

import ts from "typescript"
import { ZodType, ZodTypeAny } from "zod"
import { parseFrontMatter, testFrontMatter } from "./front-matter"
import dedent from "dedent"

const { factory: f, SyntaxKind, ScriptKind, ScriptTarget, EmitHint } = ts

const maybeIdentifierToTypeReference = (
  identifier: ts.Identifier | ts.TypeNode
) => {
  if (ts.isIdentifier(identifier)) {
    return f.createTypeReferenceNode(identifier)
  }

  return identifier
}

const createTypeReferenceFromString = (identifier: string) =>
  f.createTypeReferenceNode(f.createIdentifier(identifier))

const createUnknownKeywordNode = () =>
  f.createKeywordTypeNode(SyntaxKind.UnknownKeyword)

export const printNode = (
  node: ts.Node,
  printerOptions?: ts.PrinterOptions
): string => {
  const sourceFile = ts.createSourceFile(
    "print.ts",
    "",
    ScriptTarget.Latest,
    false,
    ScriptKind.TS
  )
  const printer = ts.createPrinter(printerOptions)
  return printer.printNode(EmitHint.Unspecified, node, sourceFile)
}

const identifierRE = /^[$A-Z_a-z][\w$]*$/

const getIdentifierOrStringLiteral = (string_: string) => {
  if (identifierRE.test(string_)) {
    return f.createIdentifier(string_)
  }

  return f.createStringLiteral(string_)
}

const addJsDocComment = (node: ts.Node, text: string) => {
  const { description, deprecated } = parseDescription(text)

  let comment = `* ${description}`
  if (deprecated) {
    comment += `\n * @deprecated ${
      typeof deprecated === "string" ? deprecated : ""
    }`
  } else {
    comment += ` `
  }

  ts.addSyntheticLeadingComment(
    node,
    SyntaxKind.MultiLineCommentTrivia,
    comment,
    true
  )
}

type ParsedDescription = {
  description: string
  deprecated?: boolean | string
  [key: string]: unknown
}

function parseDescription(description: string): ParsedDescription {
  if (!description)
    return {
      description: "",
    }
  const trimmedDescription = dedent(description)
  if (!testFrontMatter(trimmedDescription)) return { description }
  const { attributes, body } = parseFrontMatter(trimmedDescription)
  const output: ParsedDescription = {
    description: body.trim(),
  }
  if (typeof attributes === "object" && attributes !== null) {
    if ("deprecated" in attributes && attributes.deprecated) {
      if (typeof attributes.deprecated === "boolean") {
        output.deprecated = true
      } else if (typeof attributes.deprecated === "string") {
        output.deprecated =
          attributes.deprecated.length > 0 ? attributes.deprecated : true
      }
    }
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "description" || key === "deprecated") continue
      output[key] = value
    }
  }
  return output
}

type LiteralType = string | number | boolean

type ZodToTsOptions = {
  /** @deprecated use `nativeEnums` instead */
  resolveNativeEnums?: boolean
  nativeEnums?: "identifier" | "resolve" | "union"
}

const resolveOptions = (raw?: ZodToTsOptions) => {
  const resolved = {
    nativeEnums: raw?.resolveNativeEnums ? "resolve" : "identifier",
  }

  return { ...resolved, ...raw }
}

type ResolvedZodToTsOptions = ReturnType<typeof resolveOptions>

type ZodToTsStore = {
  nativeEnums: ts.EnumDeclaration[]
}

type ZodToTsReturn = {
  node: ts.TypeNode
  store: ZodToTsStore
}

type GetTypeFunction = (
  typescript: typeof ts,
  identifier: string,
  options: ResolvedZodToTsOptions
) => ts.Identifier | ts.TypeNode

type GetType = { _def: { getType?: GetTypeFunction } }

const callGetType = (
  zod: ZodTypeAny,
  identifier: string,
  options: ResolvedZodToTsOptions
) => {
  let type: ReturnType<GetTypeFunction> | undefined

  const getTypeSchema = zod as GetType
  // this must be called before accessing 'type'
  if (getTypeSchema._def.getType)
    type = getTypeSchema._def.getType(ts, identifier, options)
  return type
}

export const zodToTs = (
  zod: ZodTypeAny,
  identifier?: string,
  options?: ZodToTsOptions
): ZodToTsReturn => {
  if (!(zod instanceof ZodType)) {
    return {
      node: createUnknownKeywordNode(),
      store: { nativeEnums: [] },
    }
  }
  const resolvedIdentifier = identifier ?? "Identifier"

  const resolvedOptions = resolveOptions(options)

  const store: ZodToTsStore = { nativeEnums: [] }

  const node = zodToTsNode(zod, resolvedIdentifier, store, resolvedOptions)

  return { node, store }
}

const zodToTsNode = (
  zod: ZodTypeAny,
  identifier: string,
  store: ZodToTsStore,
  options: ResolvedZodToTsOptions
) => {
  const typeName = zod._def.typeName

  const getTypeType = callGetType(zod, identifier, options)
  // special case native enum, which needs an identifier node
  if (getTypeType && typeName !== "ZodNativeEnum") {
    return maybeIdentifierToTypeReference(getTypeType)
  }

  const otherArguments = [identifier, store, options] as const

  switch (typeName) {
    case "ZodString": {
      return f.createKeywordTypeNode(SyntaxKind.StringKeyword)
    }
    case "ZodNumber": {
      return f.createKeywordTypeNode(SyntaxKind.NumberKeyword)
    }
    case "ZodBigInt": {
      return f.createKeywordTypeNode(SyntaxKind.BigIntKeyword)
    }
    case "ZodBoolean": {
      return f.createKeywordTypeNode(SyntaxKind.BooleanKeyword)
    }
    case "ZodDate": {
      return f.createTypeReferenceNode(f.createIdentifier("Date"))
    }
    case "ZodUndefined": {
      return f.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)
    }
    case "ZodNull": {
      return f.createLiteralTypeNode(f.createNull())
    }
    case "ZodVoid": {
      return f.createUnionTypeNode([
        f.createKeywordTypeNode(SyntaxKind.VoidKeyword),
        f.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
      ])
    }
    case "ZodAny": {
      return f.createKeywordTypeNode(SyntaxKind.AnyKeyword)
    }
    case "ZodUnknown": {
      return createUnknownKeywordNode()
    }
    case "ZodNever": {
      return f.createKeywordTypeNode(SyntaxKind.NeverKeyword)
    }
    case "ZodLazy": {
      // it is impossible to determine what the lazy value is referring to
      // so we force the user to declare it
      if (!getTypeType) return createTypeReferenceFromString(identifier)
      break
    }
    case "ZodLiteral": {
      // z.literal('hi') -> 'hi'
      let literal: ts.LiteralExpression | ts.BooleanLiteral

      const literalValue = zod._def.value as LiteralType
      switch (typeof literalValue) {
        case "number": {
          literal = f.createNumericLiteral(literalValue)
          break
        }
        case "boolean": {
          literal = literalValue === true ? f.createTrue() : f.createFalse()
          break
        }
        default: {
          literal = f.createStringLiteral(literalValue)
          break
        }
      }

      return f.createLiteralTypeNode(literal)
    }
    case "ZodObject": {
      const properties = Object.entries(zod._def.shape())

      const members: ts.TypeElement[] = properties.map(([key, value]) => {
        const nextZodNode = value as ZodTypeAny
        const type = zodToTsNode(nextZodNode, ...otherArguments)

        const { typeName: nextZodNodeTypeName } = nextZodNode._def
        const isOptional =
          nextZodNodeTypeName === "ZodOptional" || nextZodNode.isOptional()

        const propertySignature = f.createPropertySignature(
          undefined,
          getIdentifierOrStringLiteral(key),
          isOptional ? f.createToken(SyntaxKind.QuestionToken) : undefined,
          type
        )

        if (nextZodNode.description) {
          addJsDocComment(propertySignature, nextZodNode.description)
        }

        return propertySignature
      })
      return f.createTypeLiteralNode(members)
    }

    case "ZodArray": {
      const type = zodToTsNode(zod._def.type, ...otherArguments)
      const node = f.createArrayTypeNode(type)
      return node
    }

    case "ZodEnum": {
      // z.enum['a', 'b', 'c'] -> 'a' | 'b' | 'c
      const types = zod._def.values.map((value: string) =>
        f.createLiteralTypeNode(f.createStringLiteral(value))
      )
      return f.createUnionTypeNode(types)
    }

    case "ZodUnion": {
      // z.union([z.string(), z.number()]) -> string | number
      const options: ZodTypeAny[] = zod._def.options
      const types: ts.TypeNode[] = options.map((option) =>
        zodToTsNode(option, ...otherArguments)
      )
      return f.createUnionTypeNode(types)
    }

    case "ZodDiscriminatedUnion": {
      // z.discriminatedUnion('kind', [z.object({ kind: z.literal('a'), a: z.string() }), z.object({ kind: z.literal('b'), b: z.number() })]) -> { kind: 'a', a: string } | { kind: 'b', b: number }
      const options: ZodTypeAny[] = [...zod._def.options.values()]
      const types: ts.TypeNode[] = options.map((option) =>
        zodToTsNode(option, ...otherArguments)
      )
      return f.createUnionTypeNode(types)
    }

    case "ZodEffects": {
      // ignore any effects, they won't factor into the types
      const node = zodToTsNode(
        zod._def.schema,
        ...otherArguments
      ) as ts.TypeNode
      return node
    }

    case "ZodNativeEnum": {
      const type = getTypeType

      if (options.nativeEnums === "union") {
        // allow overriding with this option
        if (type) return maybeIdentifierToTypeReference(type)

        const types = Object.values(zod._def.values).map((value) => {
          if (typeof value === "number") {
            return f.createLiteralTypeNode(f.createNumericLiteral(value))
          }
          return f.createLiteralTypeNode(f.createStringLiteral(value as string))
        })
        return f.createUnionTypeNode(types)
      }

      // z.nativeEnum(Fruits) -> Fruits
      // can resolve Fruits into store and user can handle enums
      if (!type) return createUnknownKeywordNode()

      if (options.nativeEnums === "resolve") {
        const enumMembers = Object.entries(
          zod._def.values as Record<string, string | number>
        ).map(([key, value]) => {
          const literal =
            typeof value === "number"
              ? f.createNumericLiteral(value)
              : f.createStringLiteral(value)

          return f.createEnumMember(getIdentifierOrStringLiteral(key), literal)
        })

        if (ts.isIdentifier(type)) {
          store.nativeEnums.push(
            f.createEnumDeclaration(undefined, type, enumMembers)
          )
        } else {
          throw new Error(
            'getType on nativeEnum must return an identifier when nativeEnums is "resolve"'
          )
        }
      }

      return maybeIdentifierToTypeReference(type)
    }

    case "ZodOptional": {
      const innerType = zodToTsNode(
        zod._def.innerType,
        ...otherArguments
      ) as ts.TypeNode
      return f.createUnionTypeNode([
        innerType,
        f.createKeywordTypeNode(SyntaxKind.UndefinedKeyword),
      ])
    }

    case "ZodNullable": {
      const innerType = zodToTsNode(
        zod._def.innerType,
        ...otherArguments
      ) as ts.TypeNode
      return f.createUnionTypeNode([
        innerType,
        f.createLiteralTypeNode(f.createNull()),
      ])
    }

    case "ZodTuple": {
      // z.tuple([z.string(), z.number()]) -> [string, number]
      const types = zod._def.items.map((option: ZodTypeAny) =>
        zodToTsNode(option, ...otherArguments)
      )
      return f.createTupleTypeNode(types)
    }

    case "ZodRecord": {
      // z.record(z.number()) -> { [x: string]: number }
      const valueType = zodToTsNode(zod._def.valueType, ...otherArguments)

      const node = f.createTypeLiteralNode([
        f.createIndexSignature(
          undefined,
          [
            f.createParameterDeclaration(
              undefined,
              undefined,
              f.createIdentifier("x"),
              undefined,
              f.createKeywordTypeNode(SyntaxKind.StringKeyword)
            ),
          ],
          valueType
        ),
      ])

      return node
    }

    case "ZodMap": {
      // z.map(z.string()) -> Map<string>
      const valueType = zodToTsNode(zod._def.valueType, ...otherArguments)
      const keyType = zodToTsNode(zod._def.keyType, ...otherArguments)

      const node = f.createTypeReferenceNode(f.createIdentifier("Map"), [
        keyType,
        valueType,
      ])

      return node
    }

    case "ZodSet": {
      // z.set(z.string()) -> Set<string>
      const type = zodToTsNode(zod._def.valueType, ...otherArguments)

      const node = f.createTypeReferenceNode(f.createIdentifier("Set"), [type])
      return node
    }

    case "ZodIntersection": {
      // z.number().and(z.string()) -> number & string
      const left = zodToTsNode(zod._def.left, ...otherArguments)
      const right = zodToTsNode(zod._def.right, ...otherArguments)
      const node = f.createIntersectionTypeNode([left, right])
      return node
    }

    case "ZodPromise": {
      // z.promise(z.string()) -> Promise<string>
      const type = zodToTsNode(zod._def.type, ...otherArguments)

      const node = f.createTypeReferenceNode(f.createIdentifier("Promise"), [
        type,
      ])

      return node
    }

    case "ZodFunction": {
      // z.function().args(z.string()).returns(z.number()) -> (args_0: string) => number
      const argumentTypes = zod._def.args._def.items.map(
        (argument: ZodTypeAny, index: number) => {
          const argumentType = zodToTsNode(argument, ...otherArguments)

          return f.createParameterDeclaration(
            undefined,
            undefined,
            f.createIdentifier(`args_${index}`),
            undefined,
            argumentType
          )
        }
      ) as ts.ParameterDeclaration[]

      argumentTypes.push(
        f.createParameterDeclaration(
          undefined,
          f.createToken(SyntaxKind.DotDotDotToken),
          f.createIdentifier(`args_${argumentTypes.length}`),
          undefined,
          f.createArrayTypeNode(createUnknownKeywordNode())
        )
      )

      const returnType = zodToTsNode(zod._def.returns, ...otherArguments)

      const node = f.createFunctionTypeNode(
        undefined,
        argumentTypes,
        returnType
      )

      return node
    }

    case "ZodDefault": {
      // z.string().optional().default('hi') -> string
      const type = zodToTsNode(
        zod._def.innerType,
        ...otherArguments
      ) as ts.TypeNode

      const filteredNodes: ts.Node[] = []

      type.forEachChild((node) => {
        if (![SyntaxKind.UndefinedKeyword].includes(node.kind)) {
          filteredNodes.push(node)
        }
      })

      // @ts-expect-error needed to set children
      type.types = filteredNodes

      return type
    }
  }

  return f.createKeywordTypeNode(SyntaxKind.AnyKeyword)
}
