"use strict"

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion", // `problem`, `suggestion`, or `layout`
    docs: {
      recommended: true,
      // URL to the documentation page for this rule
      url: "https://github.com/seamapi/nextlove/blob/main/packages/eslint-plugin/docs/rules/suggest-json-response.md",
    },
    messages: {
      missingJsonResponse: `Are you sure you don't want to return a JSON response? Using jsonResponse is an excellent method to both document your API and validate its responses.`,
    },
    fixable: null, // Or `code` or `whitespace`
    schema: [], // Add a schema if the rule has options
  },

  create(context) {
    return {
      Identifier(node) {
        if (node.name === "route_spec") {
          if (
            node.parent &&
            node.parent.init &&
            node.parent.init.expression &&
            node.parent.init.expression.properties
          ) {
            const keys = node.parent.init.expression.properties.map(
              (prop) => prop.key.name
            )
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
