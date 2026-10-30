import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { setSessionExpiredHandler } from "@/api/http"
import { queryClient } from "@/app/query-client"
import { router } from "@/app/router"
import { LazyBoundary } from "@/components/lazy-boundary"
import {
  handleSessionExpired,
  resetAbandonedSession,
} from "@/features/auth/session-expiry"
import { onTokenChangedElsewhere } from "@/features/auth/token-storage"
import { SocketProvider } from "@/realtime/socket-provider"

setSessionExpiredHandler(() => handleSessionExpired(router))
onTokenChangedElsewhere(() => window.location.reload())
router.subscribe("onResolved", () => resetAbandonedSession(router))

const Toaster = lazy(() =>
  import("@/components/ui/sonner").then((module) => ({
    default: module.Toaster,
  }))
)

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
      <LazyBoundary fallback={null}>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      </LazyBoundary>
      <ReactQueryDevtools buttonPosition="top-right" />
    </QueryClientProvider>
  )
}
