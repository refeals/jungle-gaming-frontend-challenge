import { createRouter } from "@tanstack/react-router"

import { queryClient } from "@/app/query-client"
import { ErrorScreen } from "@/components/states/error-screen"
import { routeTree } from "@/routeTree.gen"

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: ErrorScreen,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

declare module "@tanstack/history" {
  interface HistoryState {
    authOpenedInPage?: boolean
  }
}
