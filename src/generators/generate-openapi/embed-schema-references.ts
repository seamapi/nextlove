import _ from "lodash"

function findKeyInObj(obj: any, value: any): string | null {
  let resultKey: string | null = null
  _.forOwn(obj, (v, k) => {
    if (_.isObject(v) && _.isMatch(v, value)) {
      resultKey = k
      // Stop the iteration
      return false
    }
  })
  return resultKey
}

export function embedSchemaReferences(obj1: any, obj2: any): any {
  return _.transform(obj1, (result, value, key) => {
    if (_.isObject(value)) {
      const matchingKey = findKeyInObj(obj2, value)
      if (matchingKey) {
        result[key] = {
          $ref: `#/components/schemas/${matchingKey}`,
        }
      } else {
        result[key] = embedSchemaReferences(value, obj2)
      }
    } else {
      result[key] = value
    }
  })
}
