import { ESLintUtils } from '@typescript-eslint/utils';
import rule from '../../lib/rules/suggest-json-response';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('my-rule', rule, {
  valid: [
    `
      const route_spec = { jsonResponse: {} }
    `
  ],
  invalid: [
    {
      code: `const route_spec = { auth: "none" }`,
      errors: [{
        messageId: 'missingJsonResponse',
      }]
    }
  ],
});