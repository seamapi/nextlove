import { NextRequest, NextResponse } from "next/server"

export type NextloveRequest = NextRequest & {
  responseEdge: ReturnType<typeof getResponseEdge>
}

export const getResponseEdge = () => {
  const json = (body, params?: ResponseInit) => NextResponse.json(body, params)
  const status = (s: number) => {
    return {
      statusCode: s,
      json: (body, params?: ResponseInit) => json(body, { status: s, ...params }),
      status,
    }
  }

  return {
    status,
    json,
    statusCode: 200,
  }
}