import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext } from "@tanstack/react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { ErrorScreen } from "@/components/states/error-screen"
import { NotFoundScreen } from "@/components/states/not-found-screen"
import { AuthDialog } from "@/features/auth/auth-dialog"

type RouterContext = {
  queryClient: QueryClient
}

type RootSearch = {
  auth?: "login" | "register"
  redirect?: string
}

const INTERNAL_ORIGIN = "http://kurio.internal"

function isInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/")) return false
  return (
    URL.canParse(value, INTERNAL_ORIGIN) &&
    new URL(value, INTERNAL_ORIGIN).origin === INTERNAL_ORIGIN
  )
}

function validateRootSearch(search: Record<string, unknown>): RootSearch {
  return {
    auth:
      search.auth === "login" || search.auth === "register"
        ? search.auth
        : undefined,
    redirect: isInternalPath(search.redirect) ? search.redirect : undefined,
  }
}

function RootLayout() {
  return (
    <>
      <AppLayout />
      <AuthDialog />
    </>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: validateRootSearch,
  component: RootLayout,
  notFoundComponent: NotFoundScreen,
  errorComponent: ErrorScreen,
})
