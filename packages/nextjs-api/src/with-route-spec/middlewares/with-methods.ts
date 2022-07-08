import { MethodNotAllowedException } from "nextjs-exception-middleware"

export type HTTPMethods =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

export default (methods: HTTPMethods[]) => (next) => (req, res) => {
  if (!methods.includes(req.method)) {
    throw new MethodNotAllowedException({
      type: "method_not_allowed",
      message: `only ${methods.join(",")} accepted`,
    })
  }
  return next(req, res)
}
