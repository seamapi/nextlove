# Rule Documentation: suggest-json-response

The suggest-json-response rule validates if a key named jsonResponse is present in the route_spec object. This rule is useful for ensuring that the API responses conform to a certain specification.

## Rule Details

The suggest-json-response rule checks if the jsonResponse key is present in the route_spec object. If the key is not present, the rule will throw an error.

### Options

This rule does not have any options.

## Examples

### Valid

In the following example, the route_spec object contains a jsonResponse key, which is valid:

```javascript
import { z } from "zod"

const route_spec = {
  auth: "none",
  methods: ["GET"],
  jsonResponse: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email()
  })
};
```

### Invalid

In the following example, the route_spec object does not contain a jsonResponse key, which is invalid:

```javascript
import { z } from "zod"

const route_spec = {
  auth: "none",
  methods: ["GET"],
};
```

## When Not To Use

This rule should be used when enforcing a specific API response specification. If your project does not have any such specification, or if the API response specification is not important for your project, this rule can be disabled.
