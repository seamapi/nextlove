type PrefixedObject<T> = {
  [K in keyof T as `x-${string & K}`]: T[K]
}

export function prefixKeysWithX<T extends object>(obj: T): PrefixedObject<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [`x-${key}`, value])
  ) as PrefixedObject<T>
}
