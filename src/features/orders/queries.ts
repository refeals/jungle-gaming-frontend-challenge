import { queryOptions, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { ApiError } from "@/api/errors"
import { getOrder } from "@/api/orders"
import { staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type { Order } from "@/contracts"
import { clearDraft } from "@/features/checkout/checkout-draft"
import { getAttempt, resetAttempt } from "@/features/checkout/idempotency"
import {
  clearPendingOrderId,
  getPendingOrderId,
  setPendingOrderId,
} from "@/features/orders/pending-order-storage"

const PENDING_POLL_MS = 5000

export function orderOptions(userId: string, orderId: string) {
  return queryOptions({
    queryKey: queryKeys.orders.detail(userId, orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    staleTime: ({ state }) =>
      state.data && state.data.status !== "pending"
        ? staleTimes.settledOrder
        : staleTimes.pendingOrder,
    refetchInterval: ({ state }) => {
      if (state.data) {
        return state.data.status === "pending" ? PENDING_POLL_MS : false
      }
      return state.error instanceof ApiError && !state.error.transient
        ? false
        : PENDING_POLL_MS
    },
  })
}

export function useOrderSettlement(userId: string, order: Order | undefined) {
  const queryClient = useQueryClient()
  const orderId = order?.id
  const status = order?.status

  useEffect(() => {
    if (!orderId || !status) return

    if (status === "pending") {
      if (!getPendingOrderId()) setPendingOrderId(orderId, userId)
      return
    }

    const isTracked =
      getPendingOrderId() === orderId || getAttempt(userId)?.orderId === orderId
    if (!isTracked) return

    if (getPendingOrderId() === orderId) clearPendingOrderId()
    resetAttempt(userId)
    if (status === "confirmed") clearDraft(userId)
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  }, [orderId, queryClient, status, userId])
}
