import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/seamapi/nextlove/blob/main/packages/eslint-plugin/docs/rules/${name}.md`
)

export = createRule({
  defaultOptions: [],
  meta: {
    type: "suggestion",
    docs: {
      description: "Suggests to use jsonResponse when defining a route spec",
    },
    messages: {
      missingJsonResponse: `You should use jsonResponse when defining a route spec. It will be used to validate the response and to generate the OpenAPI spec.`,
    },
    fixable: "code",
    schema: [],
  },
  name: "suggest-json-response",
  create(context) {
    return {
      Identifier(node) {
        if (node.name === "route_spec") {
          if (
            node.parent &&
            node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
            node.parent.init &&
            node.parent.init.type === AST_NODE_TYPES.ObjectExpression &&
            node.parent.init.properties
          ) {
            const keys = node.parent.init.properties
              .map((prop) => {
                if (
                  prop.type === AST_NODE_TYPES.Property &&
                  prop.key.type === AST_NODE_TYPES.Identifier
                ) {
                  return prop.key.name
                }

                return null
              })
              .filter(notEmpty)

            const hasJsonResponse = keys.includes("jsonResponse")
            if (!hasJsonResponse) {
              context.report({
                node: node.parent,
                messageId: "missingJsonResponse",
                *fix(fixer) {
                  if (
                    node.parent &&
                    node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
                    node.parent.init &&
                    node.parent.init.type === AST_NODE_TYPES.ObjectExpression &&
                    node.parent.init.properties
                  ) {
                    const l = node.parent.init.properties.length
                    const defaultJsonResponse = `\n\tjsonResponse: z.object({})`
                    if (l > 0) {
                      yield fixer.insertTextAfterRange(
                        node.parent.init.properties[l - 1].range,
                        `,${defaultJsonResponse}`
                      )
                      return
                    }
                    yield fixer.insertTextAfterRange(
                      [
                        node.parent.init.range[0],
                        node.parent.init.range[1] - 1,
                      ],
                      `${defaultJsonResponse}\n`
                    )
                  }
                },
              })
            }
          }
        }
      },
    }
  },
})
