import type { Nft, NftUpdatedEvent } from "@/contracts"

const appliedEvents = new Map<string, NftUpdatedEvent>()

export function applyEventToNft(nft: Nft, event: NftUpdatedEvent): Nft {
  return event.version > nft.version
    ? { ...nft, ...event.data, version: event.version }
    : nft
}

export function rememberNftEvent(event: NftUpdatedEvent) {
  const current = appliedEvents.get(event.resourceId)
  if (!current || event.version > current.version) {
    appliedEvents.set(event.resourceId, event)
  }
}

export function forgetNftEvents() {
  appliedEvents.clear()
}

export function reconcileNft(nft: Nft): Nft {
  const event = appliedEvents.get(nft.id)
  return event ? applyEventToNft(nft, event) : nft
}
