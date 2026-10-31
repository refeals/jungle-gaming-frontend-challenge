import { queryClient } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import { clearExpiredSession } from "@/features/auth/expired-session"
import { clearCheckoutStorage } from "@/features/checkout/checkout-storage"
import { clearToken } from "@/features/auth/token-storage"
import { clearPendingOrderId } from "@/features/orders/pending-order-storage"
import { connectSocket, disconnectSocket } from "@/realtime/socket-session"

export const PRIVATE_QUERY_KEYS = [
  queryKeys.user.all,
  queryKeys.cart.all,
  queryKeys.quote.all,
  queryKeys.orders.all,
]

export function clearPrivateStorage() {
  clearToken()
  try {
    clearPendingOrderId()
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
  clearCheckoutStorage()
  clearExpiredSession()
  queryClient.setQueryData(queryKeys.session, null)

  connectSocket()
}
