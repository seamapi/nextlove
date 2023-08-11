import { SchemaObject } from "openapi3-ts/oas31"
import { RouteSpec } from "../../types"
import { askQuestion } from "./ask-question"
import chalk from "chalk"

function transformPathToFernSdkMethodName(path: string) {
  const parts = path.split("/").filter((part) => part !== "")
  const lastPart = parts[parts.length - 1]
  if (lastPart.startsWith("[") && lastPart.endsWith("]")) {
    // Convert [param] to by_param
    const param = lastPart.slice(1, -1)
    return `by_${param}`
  }

  return lastPart
}

// fern docs: https://buildwithfern.com/docs/spec/extensions
function transformPathToFernSdkGroupName(path: string) {
  const parts = path.split("/").filter((part) => part !== "")
  return parts.slice(0, parts.length - 1)
}

function getFernSdkMetadata(path: string, keyToUseAsReturnValue: string):
  | {
      "x-fern-ignore": true
    }
  | {
      "x-fern-sdk-group-name": string[]
      "x-fern-sdk-method-name": string
    } {
  if (path.split("/").filter((part) => part !== "").length === 1) {
    return {
      "x-fern-ignore": true,
    }
  }

  return {
    "x-fern-sdk-group-name": transformPathToFernSdkGroupName(path),
    "x-fern-sdk-method-name": transformPathToFernSdkMethodName(path),
    ...(keyToUseAsReturnValue ? {
      "x-fern-sdk-return-value": keyToUseAsReturnValue,
    }: {})
  }
}


async function askForWhichKeyToUseAsReturnValue(
  keys: string[],
  path: string
) {
  if (keys.length === 1) {
    return keys[0]
  }

  const choices = [...keys, "none"]
  let answer: string = await askQuestion(
    `Which key should be used as the return value for ${chalk.green(path)}?\n`,
    choices
  )

  return answer
}

export async function mapMethodsToFernSdkMetadata({
  methods,
  path,
  responseSchema,
}:{
  methods: RouteSpec["methods"],
  path: string,
  responseSchema: SchemaObject | undefined
}
) {
  let keyToUseAsReturnValue;
  if (responseSchema && responseSchema.type ==='object') {
    const p = responseSchema.properties ?? {}
    const ignore_keys = ['ok']
    const keys = Object.keys(p).filter((key) => !ignore_keys.includes(key))

    keyToUseAsReturnValue = keys[0]
    if (keys.length > 1) {
      keyToUseAsReturnValue = (await askForWhichKeyToUseAsReturnValue(
        keys,
        path
      ))
    }
  }

  const fernSdkMetadata = getFernSdkMetadata(path, keyToUseAsReturnValue)
  if (methods.length === 1) {
    return {
      [methods[0]]: fernSdkMetadata,
    }
  }

  const mappedMethods = {}
  const atLeastOneMethodIsPost = methods.includes("POST")

  if (!atLeastOneMethodIsPost) {
    throw new Error(
      "A route that accepts multiple methods should include at least the POST method."
    )
  }

  methods.forEach((method) => {
    if (method === "POST") {
      mappedMethods[method] = fernSdkMetadata
    } else {
      mappedMethods[method] = {
        "x-fern-ignore": true,
      }
    }
  })

  return mappedMethods
}
