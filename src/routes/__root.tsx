import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext } from "@tanstack/react-router"
import { lazy, Suspense, useState } from "react"

import { AppLayout } from "@/components/layout/app-layout"
import { LazyBoundary } from "@/components/lazy-boundary"
import { ErrorScreen } from "@/components/states/error-screen"
import { NotFoundScreen } from "@/components/states/not-found-screen"
import {
  useCartBaseline,
  useGuestCartMergeRetry,
} from "@/features/cart/queries"
import { useNftUpdates } from "@/features/catalog/use-nft-updates"
import { ConnectionBanner } from "@/realtime/connection-banner"

const AuthDialog = lazy(() =>
  import("@/features/auth/auth-dialog").then((module) => ({
    default: module.AuthDialog,
  }))
)

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
  if (!URL.canParse(value, INTERNAL_ORIGIN)) return false
  const { origin, pathname } = new URL(value, INTERNAL_ORIGIN)
  return origin === INTERNAL_ORIGIN && !pathname.startsWith("//")
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
  const { auth } = Route.useSearch()
  const [isDialogLoaded, setIsDialogLoaded] = useState(Boolean(auth))

  useNftUpdates()
  useGuestCartMergeRetry()
  useCartBaseline()

  if (auth && !isDialogLoaded) {
    setIsDialogLoaded(true)
  }

  return (
    <>
      <AppLayout />
      <ConnectionBanner />
      {isDialogLoaded && (
        <LazyBoundary
          fallback={
            <p
              role="alert"
              className="fixed inset-x-4 top-4 z-50 rounded-md border border-border bg-card p-3 text-center text-[14px]/5"
            >
              Não foi possível abrir o login. Recarregue a página.
            </p>
          }
        >
          <Suspense fallback={null}>
            <AuthDialog />
          </Suspense>
        </LazyBoundary>
      )}
    </>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: validateRootSearch,
  component: RootLayout,
  notFoundComponent: NotFoundScreen,
  errorComponent: ErrorScreen,
})
