import Big from "big.js"

import type { Cart, CartItem } from "@/contracts"

export type CartChange = {
  id: string
  kind: "price" | "shortage" | "restock"
  nftId: string
  itemId: string
  message: string
}

function hasShortage(item: CartItem) {
  return item.isSoldOut || item.quantity > item.maxQuantity
}

function availabilityChange(previous: CartItem, current: CartItem) {
  const label = `${current.name}, edição ${current.editionLabel}`

  if (current.isSoldOut && !previous.isSoldOut) {
    return { kind: "shortage", message: `${label}, esgotou.` } as const
  }
  if (previous.isSoldOut && !current.isSoldOut) {
    return {
      kind: "restock",
      message: `${label}, voltou a ficar disponível.`,
    } as const
  }
  if (hasShortage(current) && current.maxQuantity < previous.maxQuantity) {
    return {
      kind: "shortage",
      message: `${label}: só restam ${current.maxQuantity}.`,
    } as const
  }
  return null
}

export function diffCarts(previous: Cart, current: Cart) {
  const previousItems = new Map(previous.items.map((item) => [item.id, item]))
  const changes = new Map<string, CartChange>()

  for (const item of current.items) {
    const before = previousItems.get(item.id)
    if (!before) continue

    if (!Big(before.unitPriceEth).eq(item.unitPriceEth)) {
      const id = `price:${item.nftId}`
      changes.set(id, {
        id,
        kind: "price",
        nftId: item.nftId,
        itemId: item.id,
        message: `${item.name} mudou de ${before.unitPriceEth} para ${item.unitPriceEth} ETH.`,
      })
    }

    const availability = availabilityChange(before, item)
    if (availability) {
      const id = `availability:${item.id}`
      changes.set(id, {
        id,
        nftId: item.nftId,
        itemId: item.id,
        ...availability,
      })
    }
  }

  return [...changes.values()]
}

export function mergeChanges(current: CartChange[], found: CartChange[]) {
  const foundIds = new Set(found.map((change) => change.id))
  return [...current.filter((change) => !foundIds.has(change.id)), ...found]
}

export function keepRelevantChanges(
  changes: CartChange[],
  cart: Cart | undefined
) {
  const items = cart?.items ?? []

  return changes.filter((change) => {
    if (change.kind === "price") {
      return items.some((item) => item.nftId === change.nftId)
    }
    const item = items.find(({ id }) => id === change.itemId)
    return (
      item !== undefined && (change.kind === "restock" || hasShortage(item))
    )
  })
}

export function changeLabelsFor(item: CartItem, changes: CartChange[]) {
  const labels: string[] = []
  if (
    changes.some(({ kind, nftId }) => kind === "price" && nftId === item.nftId)
  ) {
    labels.push("Preço alterado")
  }
  if (
    changes.some(({ kind, itemId }) => kind !== "price" && itemId === item.id)
  ) {
    labels.push("Disponibilidade alterada")
  }
  return labels
}
