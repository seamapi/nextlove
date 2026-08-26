/**
 * OpenAPI generation emits a single "semantic" operation per route. This
 * resolves which method that operation is generated from:
 *
 * - After removing `deprecatedMethods`, a route with a single method uses it.
 * - A route with exactly two methods uses the one that is not POST (the POST
 *   is treated as an alias of the semantic method).
 * - A route with three or more methods is ambiguous. The caller must set
 *   `deprecatedMethods` on the route spec to bring the count down to two.
 *
 * Returns `undefined` when every method is deprecated (nothing to generate).
 */
export function selectSemanticMethod(
  routePath: string,
  methods: readonly string[],
  deprecatedMethods: readonly string[] = []
): string | undefined {
  const deprecated_set = new Set(deprecatedMethods.map((m) => m.toUpperCase()))
  const semantic_methods = methods.filter(
    (method) => !deprecated_set.has(method.toUpperCase())
  )

  if (semantic_methods.length === 0) {
    return undefined
  }

  if (semantic_methods.length === 1) {
    return semantic_methods[0]
  }

  const non_post_methods = semantic_methods.filter(
    (method) => method.toUpperCase() !== "POST"
  )

  if (semantic_methods.length === 2 && non_post_methods.length === 1) {
    return non_post_methods[0]
  }

  throw new Error(
    `Route "${routePath}" has ${
      semantic_methods.length
    } non-deprecated methods (${semantic_methods.join(
      ", "
    )}), so a single semantic method cannot be determined for OpenAPI generation. ` +
      `Set "deprecatedMethods" on the route spec to ignore all but the semantic method and (optionally) its POST alias.`
  )
}
