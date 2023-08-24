import { MethodNotAllowedException } from "../../../http-exceptions"

export type HTTPMethodsLegacy =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

export const withMethodsLegacy =
  (methods: HTTPMethodsLegacy[]) => (next) => (req, res) => {
    if (!methods.includes(req.method)) {
      throw new MethodNotAllowedException({
        type: "method_not_allowed",
        message: `only ${methods.join(",")} accepted`,
      })
    }
    return next(req, res)
  }
