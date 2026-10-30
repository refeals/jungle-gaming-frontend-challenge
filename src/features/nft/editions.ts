import type { Edition, Nft } from "@/contracts"

const MAX_PER_ORDER = 10

function isAvailable(edition: Edition) {
  return edition.available === null || edition.available > 0
}

export function getMaxQuantity(edition: Edition) {
  return edition.available === null
    ? MAX_PER_ORDER
    : Math.min(edition.available, MAX_PER_ORDER)
}

export function isSoldOut(nft: Nft) {
  return !nft.editions.some(isAvailable)
}

export function isEditionAvailable(edition: Edition) {
  return isAvailable(edition)
}

export function resolveEdition(nft: Nft, editionId: string | undefined) {
  const fallback = nft.editions.find(isAvailable) ?? nft.editions[0]
  const requested = nft.editions.find((item) => item.id === editionId)

  if (requested && isAvailable(requested)) {
    return { edition: requested, wasReplaced: false }
  }

  return { edition: fallback, wasReplaced: editionId !== undefined }
}
