/* eslint-disable @typescript-eslint/ban-ts-comment */
import { VariableDeclarator } from '@swc/core';
import { AST_NODE_TYPES, TSESTree, ESLintUtils } from '@typescript-eslint/utils';
// import {  } from '@typescript-eslint/utils';
function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}


const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/seamapi/nextlove/blob/main/packages/eslint-plugin/docs/rules/${name}.md`,
);

// Type: RuleModule<"uppercase", ...>
export const rule = createRule({
  defaultOptions: [],
  meta: {
    type: "suggestion", // `problem`, `suggestion`, or `layout`
    docs: {
      recommended: "warn",
      description:  'Function declaration names should start with an upper-case letter.',
      // URL to the documentation page for this rule
      // url: "suggest-json-response.md",
    },
    messages: {
      missingJsonResponse: `Are you sure you don't want to return a JSON response? Using jsonResponse is an excellent method to both document your API and validate its responses.`,
    },
    // fixable: null, // Or `code` or `whitespace`
    schema: [], // Add a schema if the rule has options
  },
  name: 'suggest-json-response',
  create(context) {
    return {
      Identifier(node) {
        if (node.name === "route_spec") {
          if (
            node.parent &&
            node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
            node.parent.init 
            && node.parent.init.type === AST_NODE_TYPES.ObjectExpression
            && node.parent.init.properties
          ) {
            const keys = node.parent.init.properties
            .map(
              (prop) => {
                if (prop.type === AST_NODE_TYPES.Property && prop.key.type === AST_NODE_TYPES.Identifier) {
                  return prop.key.name
                }

                return null
              }
            )
            .filter(notEmpty)

            const hasJsonResponse = keys.includes("jsonResponse")
            if (!hasJsonResponse) {
              context.report({
                node: node.parent,
                messageId: "missingJsonResponse",
              })
            }
          }
        }
      },
    }
  },
}
)