import { queryClient } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type { router } from "@/app/router"
import type { Session } from "@/contracts"
import {
  getExpiredUserId,
  markSessionExpired,
} from "@/features/auth/expired-session"
import { isPrivateRoute } from "@/features/auth/private-route"
import { getReturnTarget } from "@/features/auth/return-target"
import {
  clearPrivateStorage,
  resetPrivateState,
} from "@/features/auth/session-reset"
import { clearToken } from "@/features/auth/token-storage"
import { notify } from "@/lib/notify"
import { connectSocket, disconnectSocket } from "@/realtime/socket-session"

export function handleSessionExpired(appRouter: typeof router) {
  if (getExpiredUserId() !== null) return

  const user = queryClient.getQueryData<Session | null>(queryKeys.session)?.user

  if (!user) {
    clearPrivateStorage()
    return
  }

  const { location } = appRouter.state

  if (!isPrivateRoute(appRouter)) {
    resetPrivateState()
    notify("Sua sessão expirou. Entre novamente.")
    return
  }

  disconnectSocket()
  markSessionExpired(user.id)
  clearToken()
  queryClient.setQueryData(queryKeys.session, null)
  connectSocket()

  void appRouter.navigate({
    to: location.pathname as ".",
    hash: true,
    replace: true,
    resetScroll: false,
    hashScrollIntoView: false,
    search: (prev) => ({
      ...prev,
      auth: "login",
      redirect: getReturnTarget(location),
    }),
  })
}

export function resetAbandonedSession(appRouter: typeof router) {
  if (getExpiredUserId() !== null && !isPrivateRoute(appRouter)) {
    resetPrivateState()
  }
}
