import { queryClient } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import { clearExpiredSession } from "@/features/auth/expired-session"
import { clearToken } from "@/features/auth/token-storage"
import { connectSocket, disconnectSocket } from "@/realtime/socket-session"

const PENDING_ORDER_KEY = "kurio.pendingOrderId"
export const PRIVATE_QUERY_KEYS = [
  queryKeys.user.all,
  queryKeys.cart.all,
  queryKeys.quote.all,
  queryKeys.orders.all,
]

export function clearPrivateStorage() {
  clearToken()
  try {
    localStorage.removeItem(PENDING_ORDER_KEY)
  } catch (error) {
    console.error(error)
  }
}

export function resetPrivateState() {
  disconnectSocket()

  void queryClient.cancelQueries({ queryKey: queryKeys.session })
  for (const queryKey of PRIVATE_QUERY_KEYS) {
    void queryClient.cancelQueries({ queryKey })
    queryClient.removeQueries({ queryKey })
  }

  queryClient.getMutationCache().clear()

  clearPrivateStorage()
  clearExpiredSession()
  queryClient.setQueryData(queryKeys.session, null)

  connectSocket()
}
