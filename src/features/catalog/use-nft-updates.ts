import { useQueryClient, type QueryClient } from "@tanstack/react-query"

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

function applyNftUpdate(queryClient: QueryClient, payload: unknown) {
  const parsed = nftUpdatedEvent.safeParse(payload)
  if (!parsed.success) return

  const event = parsed.data
  if (dedupe.isDuplicate(event.eventId)) return

  rememberNftEvent(event)

  const patch = (nft: Nft | undefined) =>
    nft && nft.id === event.resourceId ? applyEventToNft(nft, event) : nft

  queryClient.setQueryData<Nft>(queryKeys.nfts.detail(event.resourceId), patch)
  queryClient.setQueryData<Nft>(queryKeys.nfts.featured, patch)
  queryClient.setQueriesData<NftListResponse>(
    { queryKey: queryKeys.nfts.lists },
    (list) =>
      list && {
        ...list,
        items: list.items.map((nft) =>
          nft.id === event.resourceId ? applyEventToNft(nft, event) : nft
        ),
      }
  )

  void queryClient.invalidateQueries({ queryKey: queryKeys.cart })
  void queryClient.invalidateQueries({ queryKey: queryKeys.quote })
}

export function useNftUpdates() {
  const queryClient = useQueryClient()

  useSocketEvent("nft.updated", (payload) =>
    applyNftUpdate(queryClient, payload)
  )
}
