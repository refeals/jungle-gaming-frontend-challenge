import type { router } from "@/app/router"

export function isPrivateRoute(appRouter: typeof router) {
  return appRouter.state.matches.some(
    (match) => match.routeId === "/_authenticated"
  )
}
