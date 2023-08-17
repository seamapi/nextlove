import { RouteSpec } from "../../types"

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

function getFernSdkMetadata(
  path: string,
  sdkReturnValue?: string
):
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
    ...(sdkReturnValue
      ? {
          "x-fern-sdk-return-value": sdkReturnValue,
        }
      : {}),
  }
}

export async function mapMethodsToFernSdkMetadata({
  methods,
  path,
  sdkReturnValue,
}: {
  methods: RouteSpec["methods"]
  path: string
  sdkReturnValue?: string
}) {
  const fernSdkMetadata = getFernSdkMetadata(path, sdkReturnValue)
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
