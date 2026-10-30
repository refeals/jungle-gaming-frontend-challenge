import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { queryKeys } from "@/app/query-keys"
import type { Nft, NftListResponse } from "@/contracts"
import { nftUpdatedEvent } from "@/contracts/events"
import {
  applyEventToNft,
  rememberNftEvent,
} from "@/realtime/applied-nft-events"
import { createEventDedupe } from "@/realtime/event-dedupe"
import { useSocketEvent } from "@/realtime/use-socket-event"

const dedupe = createEventDedupe()

function patchQueries<Data>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  patch: (data: Data) => Data
) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
    const { data, dataUpdatedAt, isInvalidated } = query.state
    if (data === undefined) continue

    const next = patch(data as Data)
    if (next === data) continue

    queryClient.setQueryData(query.queryKey, next, { updatedAt: dataUpdatedAt })
    if (isInvalidated) {
      void queryClient.invalidateQueries({
        queryKey: query.queryKey,
        exact: true,
        refetchType: "none",
      })
    }
  }
}

function applyNftUpdate(queryClient: QueryClient, payload: unknown) {
  const parsed = nftUpdatedEvent.safeParse(payload)
  if (!parsed.success) return

  const event = parsed.data
  if (dedupe.isDuplicate(event.eventId)) return

  rememberNftEvent(event)

  const patch = (nft: Nft) =>
    nft.id === event.resourceId ? applyEventToNft(nft, event) : nft

  patchQueries<Nft>(queryClient, queryKeys.nfts.detail(event.resourceId), patch)
  patchQueries<Nft>(queryClient, queryKeys.nfts.featured, patch)
  patchQueries<NftListResponse>(queryClient, queryKeys.nfts.lists, (list) => {
    const items = list.items.map(patch)
    return items.some((nft, index) => nft !== list.items[index])
      ? { ...list, items }
      : list
  })

  void queryClient.invalidateQueries({ queryKey: queryKeys.cart })
  void queryClient.invalidateQueries({ queryKey: queryKeys.quote })
}

export function useNftUpdates() {
  const queryClient = useQueryClient()

  useSocketEvent("nft.updated", (payload) =>
    applyNftUpdate(queryClient, payload)
  )
}
