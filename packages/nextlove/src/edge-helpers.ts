import { NextApiRequest, NextApiResponse } from "next"
import { NextRequest, NextResponse } from "next/server"

export type NextloveResponse = ReturnType<typeof getNextloveResponse>
export type NextloveRequest = NextRequest & {
  NextResponse: NextloveResponse
}

const DEFAULT_STATUS = 200

/*
 * This is the edge runtime version of the response object.
 * It is a wrapper around NextResponse that adds a `status` method
 */
export const getNextloveResponse = (
  req: NextloveRequest,
  {
    addIf,
    addOkStatus,
  }: {
    addIf?: (req: NextloveRequest) => boolean
    addOkStatus?: boolean
  }
) => {
  const json = (body, params?: ResponseInit) => {
    console.log({ body, params })
    const statusCode = params?.status ?? DEFAULT_STATUS
    const ok = statusCode >= 200 && statusCode < 300

    const shouldIncludeStatus = addIf && addOkStatus ? addIf(req) : addOkStatus

    const bodyWithPossibleOk = shouldIncludeStatus ? { ...body, ok } : body

    // console.log({NextResponse})

    return NextResponse.json(bodyWithPossibleOk, params)
  }

  const status = (s: number) => {
    return {
      statusCode: s,
      json: (body, params?: ResponseInit) =>
        json(body, { status: s, ...params }),
      status,
    }
  }

  return {
    status,
    json,
    statusCode: 200,
  }
}

type GetLegacyCompatibleReqResReturn = {
  headers: Map<string, string | string[] | undefined>
  url: string | undefined
  redirect: (url: string, status?: number) => any
}
export function getLegacyCompatibleReqRes(
  req: NextApiRequest,
  res: NextApiResponse
): GetLegacyCompatibleReqResReturn
export function getLegacyCompatibleReqRes(
  req: NextRequest,
  res: NextloveResponse
): GetLegacyCompatibleReqResReturn
export function getLegacyCompatibleReqRes(
  req: NextRequest | NextApiRequest,
  res: NextloveResponse | NextApiResponse
): GetLegacyCompatibleReqResReturn {
  const headerMap = new Map<string, string | string[]>()
  if (req instanceof NextRequest) {
    req.headers.forEach((value, key) => {
      console.log(`${key}: ${value}`)
      headerMap.set(key, value as string | string[])
    })

    const [http, empty, host, ...url] = req.url.split("/")

    return {
      url: url.length > 0 ? `/${url.join("/")}` : undefined,
      headers: headerMap,
      redirect: (url: string, status?: number): any =>
        NextResponse.redirect(url, {
          ...(status
            ? {
                status,
              }
            : {}),
        }),
    }
  }

  for (const [key, value] of Object.entries(req.headers)) {
    headerMap.set(key, value as string | string[])
  }

  return {
    url: req.url,
    headers: headerMap,
    redirect: (url: string, status?: number): any => {
      if (status) {
        return (res as NextApiResponse).redirect(status, url)
      }
      return (res as NextApiResponse).redirect(url)
    },
  }
}

export function isEmpty(value: any): boolean {
  if (value == null) {
    return true
  }

  if (
    Array.isArray(value) ||
    typeof value === "string" ||
    typeof value === "function" ||
    value instanceof ArrayBuffer
  ) {
    return !value.length
  }

  if (value instanceof Map || value instanceof Set) {
    return !value.size
  }

  if (typeof value === "object") {
    return !Object.keys(value).length
  }

  return false
}
