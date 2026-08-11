type SnakeToDash<T> = {
  [K in keyof T as K extends string ? SnakeToDashString<K> : K]: T[K]
}

type SnakeToDashString<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}-${SnakeToDashString<U>}`
  : S

export function dashifyObjectKeys<T extends object>(obj: T): SnakeToDash<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.replace(/_/g, "-"), value])
  ) as SnakeToDash<T>
}
