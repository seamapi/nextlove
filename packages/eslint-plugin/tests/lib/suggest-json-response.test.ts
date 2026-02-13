import { RuleTester } from "@typescript-eslint/rule-tester"
import * as tseslintParser from "@typescript-eslint/parser"
import rule from "../../lib/rules/suggest-json-response"

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslintParser },
})

ruleTester.run("my-rule", rule, {
  valid: [
    `
      const route_spec = { jsonResponse: {} }
    `,
  ],
  invalid: [
    {
      code: `const route_spec = { auth: "none" }`,
      output: `const route_spec = { auth: "none",\n\tjsonResponse: z.object({}) }`,
      errors: [
        {
          messageId: "missingJsonResponse",
        },
      ],
    },
  ],
})
