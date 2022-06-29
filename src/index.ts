import { RouteSpecHandler } from "./with-route-spec"

export const getWithRouteSpec = (authMiddlewares: {
  [key: string]: (next: Function) => Function
}) => {
  return new RouteSpecHandler(authMiddlewares)
}
