import type { Nft } from "@/contracts"
import type { MockDb } from "@/mocks/db/schema"
import { fail } from "@/mocks/http/failure"
import type { PendingEvent } from "@/mocks/services/events"

export function findNft(db: MockDb, nftId: string) {
  return (
    db.nfts.find((nft) => nft.id === nftId) ??
    fail(404, "not_found", "NFT não encontrado.")
  )
}

export function updateNft(
  db: MockDb,
  nftId: string,
  change: (nft: Nft) => void
): PendingEvent {
  const nft = findNft(db, nftId)
  change(nft)
  nft.version += 1

  return {
    userId: null,
    envelope: {
      eventId: `nft.updated:${nft.id}:${nft.version}`,
      type: "nft.updated",
      resourceId: nft.id,
      version: nft.version,
      data: {
        priceEth: nft.priceEth,
        previousPriceEth: nft.previousPriceEth,
        editions: nft.editions,
      },
    },
  }
}

export function changeAvailability(
  db: MockDb,
  nftId: string,
  editionId: string,
  delta: number
) {
  return updateNft(db, nftId, (nft) => {
    const edition = nft.editions.find((item) => item.id === editionId)
    if (edition && edition.available !== null) {
      edition.available += delta
    }
  })
}
