import type { Network, Quote } from "@/contracts"
import { now } from "@/mocks/db/clock"
import { multiply, NETWORK_FEES } from "@/mocks/db/money"
import type { MockDb } from "@/mocks/db/schema"
import { fail } from "@/mocks/http/failure"
import {
  activeCoupon,
  calculateTotals,
  findEdition,
  maxQuantity,
} from "@/mocks/services/cart"
import { nextId } from "@/mocks/services/ids"

const QUOTE_TTL_MS = 5 * 60 * 1000

type DbCart = MockDb["carts"][number]

export function assertCartPurchasable(db: MockDb, cart: DbCart | null) {
  if (!cart || cart.items.length === 0) {
    fail(422, "validation_error", "Seu carrinho está vazio.")
  }

  const unavailable = cart.items.flatMap((item) => {
    const { edition } = findEdition(db, item.nftId, item.editionId)
    const availableQuantity = maxQuantity(edition)
    return item.quantity > availableQuantity
      ? [
          {
            nftId: item.nftId,
            editionId: item.editionId,
            requestedQuantity: item.quantity,
            availableQuantity,
          },
        ]
      : []
  })

  if (unavailable.length > 0) {
    fail(409, "availability_conflict", "Há itens sem disponibilidade.", {
      details: { items: unavailable },
    })
  }

  return cart
}

function calculateValues(db: MockDb, cart: DbCart, network: Network) {
  const coupon = activeCoupon(db, cart)
  const lines = cart.items.map((item) => {
    const { nft, edition } = findEdition(db, item.nftId, item.editionId)
    return {
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.images[0],
      editionLabel: edition.label,
      unitPriceEth: nft.priceEth,
      quantity: item.quantity,
      lineTotalEth: multiply(nft.priceEth, item.quantity),
    }
  })

  return {
    lines,
    couponCode: coupon?.code ?? null,
    network,
    ...calculateTotals(
      lines.map((line) => line.lineTotalEth),
      NETWORK_FEES[network],
      coupon?.percent ?? null
    ),
  }
}

export function createQuote(
  db: MockDb,
  userId: string,
  cart: DbCart,
  network: Network
) {
  const stored = {
    ...calculateValues(db, cart, network),
    quoteId: nextId(db, "quote"),
    version: db.sequence,
    userId,
    expiresAt: new Date(now(db).getTime() + QUOTE_TTL_MS).toISOString(),
  }
  db.quotes = db.quotes.filter((quote) => quote.userId !== userId)
  db.quotes.push(stored)
  return stored
}

function toFingerprint(values: ReturnType<typeof calculateValues>) {
  return JSON.stringify([
    values.lines.map((line) => [
      line.nftId,
      line.editionId,
      line.unitPriceEth,
      line.quantity,
    ]),
    values.couponCode,
    values.network,
    values.subtotalEth,
    values.discountEth,
    values.feeEth,
    values.totalEth,
  ])
}

export function isQuoteCurrent(db: MockDb, quote: Quote, cart: DbCart) {
  return (
    new Date(quote.expiresAt) > now(db) &&
    toFingerprint(quote) ===
      toFingerprint(calculateValues(db, cart, quote.network))
  )
}
