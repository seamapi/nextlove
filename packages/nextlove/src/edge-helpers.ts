import { NextRequest } from "next/server"
import { NextResponse } from "next/server"

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
    const statusCode = params?.status ?? DEFAULT_STATUS
    const ok = statusCode >= 200 && statusCode < 300

    const shouldIncludeStatus = addIf && addOkStatus ? addIf(req) : addOkStatus

    const bodyWithPossibleOk = shouldIncludeStatus ? { ...body, ok } : body
    console.log("ok")

    // @ts-ignore
    return NextResponse.default.json(bodyWithPossibleOk, params)
  }

  const status = (s: number) => {
    console.log("status", s)
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
