import type { Nft, NftReview } from "@/contracts"
import { now } from "@/mocks/db/clock"
import type { MockDb } from "@/mocks/db/schema"
import { fail } from "@/mocks/http/failure"
import type { PendingEvent } from "@/mocks/services/events"
import { nextId } from "@/mocks/services/ids"

const FEATURED_NFT_ID = "sage-nomad-009"
const DAY_MS = 86_400_000

const REVIEW_AUTHORS = [
  "Marina Costa",
  "Theo Almeida",
  "Lia Nakamura",
  "Rafa Monteiro",
  "Bia Fontes",
  "Caio Prado",
]

const REVIEW_COMMENTS = [
  "Arte impecável e procedência clara. Chegou à carteira sem nenhum problema.",
  "Os detalhes em alta resolução surpreendem. Uma das melhores peças da minha coleção.",
  "Boa comunicação do criador e metadados completos. Compraria de novo.",
  "A edição vale o preço, e o acesso para colecionadores é um ótimo bônus.",
  "Peça forte, com identidade própria. Gosto de como ela se destaca na galeria.",
]

export function findNft(db: MockDb, nftId: string) {
  return (
    db.nfts.find((nft) => nft.id === nftId) ??
    fail(404, "not_found", "NFT não encontrado.")
  )
}

export function findFeaturedNft(db: MockDb) {
  return findNft(db, FEATURED_NFT_ID)
}

export function listReviews(db: MockDb, nft: Nft): NftReview[] {
  const today = now(db).getTime()

  return Array.from({ length: nft.reviewCount }, (_, index) => ({
    id: `${nft.id}-review-${index + 1}`,
    author: REVIEW_AUTHORS[index % REVIEW_AUTHORS.length],
    rating: 5 - (index % 3),
    comment: REVIEW_COMMENTS[index % REVIEW_COMMENTS.length],
    createdAt: new Date(today - (index + 1) * DAY_MS).toISOString(),
  }))
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
      eventId: nextId(db, `nft.updated:${nft.id}:${nft.version}`),
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
