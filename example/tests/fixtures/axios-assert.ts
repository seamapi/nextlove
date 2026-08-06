import { type ExecutionContext } from "ava"

type ThrowsParams = {
  status?: number
  error?: {
    type?: string
    message?: string
  }
}

const throws = async (
  t: ExecutionContext,
  func: () => Promise<any>,
  params?: ThrowsParams
) => {
  try {
    await func()
    t.fail("Expected to throw.")
  } catch (error) {
    if (params?.status) {
      t.is(error.status, params.status)
    }

    if (params?.error) {
      t.like(error.response.error, params.error)
    }
  }
}

export const axiosAssert = { throws }

export default axiosAssert
