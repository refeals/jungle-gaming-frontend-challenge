import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "@tanstack/react-router"

import { queryClient } from "@/app/query-client"
import { router } from "@/app/router"
import { Toaster } from "@/components/ui/sonner"
import { SocketProvider } from "@/realtime/socket-provider"

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
      <Toaster />
      <ReactQueryDevtools buttonPosition="top-right" />
    </QueryClientProvider>
  )
}
