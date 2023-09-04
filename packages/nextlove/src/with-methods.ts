import { MethodNotAllowedException } from "./http-exceptions"

export type HTTPMethods =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

export const withMethods = (methods: HTTPMethods[]) => (next) => (req, res) => {
  if (!methods.includes(req.method)) {
    // console.log({res})
    throw new MethodNotAllowedException({
      type: "method_not_allowed",
      message: `only ${methods.join(",")} accepted`,
    })
  }
  return next(req, res)
}
