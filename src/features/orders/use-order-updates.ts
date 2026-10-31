import { useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-keys"
import type { Order, Session } from "@/contracts"
import { orderUpdatedEvent } from "@/contracts/events"
import { createEventDedupe } from "@/realtime/event-dedupe"
import { useSocketEvent } from "@/realtime/use-socket-event"

const dedupe = createEventDedupe()

function applyOrderUpdate(queryClient: QueryClient, payload: unknown) {
  const parsed = orderUpdatedEvent.safeParse(payload)
  if (!parsed.success) return

  const event = parsed.data
  const session = queryClient.getQueryData<Session | null>(queryKeys.session)
  if (!session || dedupe.isDuplicate(event.eventId)) return

  const queryKey = queryKeys.orders.detail(session.user.id, event.resourceId)
  const order = queryClient.getQueryData<Order>(queryKey)
  if (order && (order.status !== "pending" || event.version <= order.version)) {
    return
  }

  void queryClient
    .cancelQueries({ queryKey, exact: true })
    .then(() => queryClient.invalidateQueries({ queryKey, exact: true }))
}

export function useOrderUpdates() {
  const queryClient = useQueryClient()

  useSocketEvent("order.updated", (payload) =>
    applyOrderUpdate(queryClient, payload)
  )
}
