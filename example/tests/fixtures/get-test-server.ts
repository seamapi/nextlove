import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import type { ExecutionContext } from "ava"
import axios from "axios"
import next from "next"

/**
 * Preparing the Next.js app is expensive, so every test in a worker shares one
 * server. The handle is unref'd so it never keeps the worker alive.
 */
let testServer: Promise<{ serverURL: string; server: Server }> | undefined

const startTestServer = async () => {
  const app = next({ dev: false, dir: process.cwd(), quiet: true })
  await app.prepare()

  const handle = app.getRequestHandler()
  const server = createServer((req, res) => {
    handle(req, res)
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      resolve()
    })
  })
  server.unref()

  const { port } = server.address() as AddressInfo

  return { serverURL: `http://127.0.0.1:${port}`, server }
}

export default async (_t: ExecutionContext) => {
  testServer ??= startTestServer()
  const { serverURL, server } = await testServer

  const customAxios = axios.create({ baseURL: serverURL })

  // Simplify axios errors
  customAxios.interceptors.response.use(
    (res) => res,
    (err) =>
      err.request && err.response
        ? Promise.reject({
            url: err.request.path,
            status: err.response.status,
            statusText: err.response.statusText,
            response: err.response.data,
            headers: err.response.headers,
          })
        : Promise.reject(err)
  )

  return {
    port: (server.address() as AddressInfo).port,
    serverURL,
    axios: customAxios,
    close: () => {
      server.close()
    },
  }
}
