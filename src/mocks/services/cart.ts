import type { Cart, CartSummary, Edition } from "@/contracts"
import { now } from "@/mocks/db/clock"
import {
  add,
  highestFee,
  multiply,
  percentOff,
  subtract,
} from "@/mocks/db/money"
import type { MockDb } from "@/mocks/db/schema"
import { fail } from "@/mocks/http/failure"
import { nextId } from "@/mocks/services/ids"
import { findNft } from "@/mocks/services/nfts"

const MAX_QUANTITY_PER_ITEM = 10

type DbCart = MockDb["carts"][number]
type DbCartItem = DbCart["items"][number]

export function maxQuantity(edition: Edition) {
  return Math.min(
    edition.available ?? MAX_QUANTITY_PER_ITEM,
    MAX_QUANTITY_PER_ITEM
  )
}

export function findEdition(db: MockDb, nftId: string, editionId: string) {
  const nft = findNft(db, nftId)
  const edition =
    nft.editions.find((item) => item.id === editionId) ??
    fail(404, "not_found", "Edição não encontrada.")
  return { nft, edition }
}

export function activeCoupon(db: MockDb, cart: DbCart | null) {
  const coupon = db.coupons.find((item) => item.code === cart?.couponCode)
  return coupon && new Date(coupon.expiresAt) > now(db) ? coupon : null
}

export function calculateTotals(
  lineTotals: string[],
  feeEth: string,
  couponPercent: number | null
): CartSummary {
  const subtotalEth = add(...lineTotals)
  const discountEth =
    couponPercent === null ? "0" : percentOff(subtotalEth, couponPercent)

  return {
    subtotalEth,
    discountEth,
    feeEth,
    totalEth: add(subtract(subtotalEth, discountEth), feeEth),
  }
}

export function toCartResponse(db: MockDb, cart: DbCart | null): Cart {
  const coupon = activeCoupon(db, cart)
  const items = (cart?.items ?? []).map((item) => {
    const { nft, edition } = findEdition(db, item.nftId, item.editionId)
    const limit = maxQuantity(edition)

    return {
      id: item.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.images[0],
      editionLabel: edition.label,
      network: nft.network,
      unitPriceEth: nft.priceEth,
      quantity: item.quantity,
      lineTotalEth: multiply(nft.priceEth, item.quantity),
      maxQuantity: limit,
      isSoldOut: limit === 0,
    }
  })

  return {
    id: cart?.id ?? null,
    items,
    couponCode: coupon?.code ?? null,
    summary: calculateTotals(
      items.map((item) => item.lineTotalEth),
      highestFee(items.map((item) => item.network)),
      coupon?.percent ?? null
    ),
  }
}

export function getOrCreateCart(
  db: MockDb,
  user: { id: string } | null,
  cart: DbCart | null
) {
  if (cart) return cart

  const created: DbCart = {
    id: user ? nextId(db, "cart") : `guest-${crypto.randomUUID()}`,
    userId: user?.id ?? null,
    couponCode: null,
    items: [],
  }
  db.carts.push(created)
  return created
}

export function addCartItem(
  db: MockDb,
  cart: DbCart,
  input: { nftId: string; editionId: string; quantity: number }
) {
  const { edition } = findEdition(db, input.nftId, input.editionId)
  const existing = cart.items.find(
    (item) => item.nftId === input.nftId && item.editionId === input.editionId
  )
  const requested = (existing?.quantity ?? 0) + input.quantity
  assertWithinLimit(input.nftId, edition, requested)

  if (existing) {
    existing.quantity = requested
    return
  }

  cart.items.push({
    id: nextId(db, "cart-item"),
    nftId: input.nftId,
    editionId: input.editionId,
    quantity: requested,
  })
}

export function assertWithinLimit(
  nftId: string,
  edition: Edition,
  quantity: number
) {
  const limit = maxQuantity(edition)
  if (quantity <= limit) return

  fail(409, "availability_conflict", "Quantidade acima da disponibilidade.", {
    details: {
      items: [
        {
          nftId,
          editionId: edition.id,
          requestedQuantity: quantity,
          availableQuantity: limit,
        },
      ],
    },
  })
}

export function findOwnedItem(
  db: MockDb,
  cart: DbCart | null,
  itemId: string
): DbCartItem {
  const item = cart?.items.find((candidate) => candidate.id === itemId)
  if (item) return item

  const belongsToAnother = db.carts.some((candidate) =>
    candidate.items.some((other) => other.id === itemId)
  )
  if (belongsToAnother) {
    fail(403, "forbidden", "Este item pertence a outro carrinho.")
  }
  fail(404, "not_found", "Item não encontrado no carrinho.")
}

export function applyCoupon(db: MockDb, cart: DbCart, rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  const coupon = db.coupons.find((item) => item.code === code)

  if (!coupon) {
    fail(422, "coupon_invalid", "Código promocional inválido.", {
      fields: { code: "Código promocional inválido." },
    })
  }
  if (new Date(coupon.expiresAt) <= now(db)) {
    fail(422, "coupon_expired", "Este código promocional expirou.", {
      fields: { code: "Este código promocional expirou." },
    })
  }

  cart.couponCode = code
}

export function mergeCarts(
  db: MockDb,
  user: { id: string },
  guestCartId: string
) {
  const userCart = getOrCreateCart(
    db,
    user,
    db.carts.find((candidate) => candidate.userId === user.id) ?? null
  )
  const guestCart = db.carts.find(
    (candidate) => candidate.userId === null && candidate.id === guestCartId
  )
  if (!guestCart) return { cart: userCart, adjustments: [] }

  const adjustments = []

  for (const guestItem of guestCart.items) {
    const { edition } = findEdition(db, guestItem.nftId, guestItem.editionId)
    const existing = userCart.items.find(
      (item) =>
        item.nftId === guestItem.nftId && item.editionId === guestItem.editionId
    )
    const requestedQuantity = (existing?.quantity ?? 0) + guestItem.quantity
    const limit = maxQuantity(edition)
    const appliedQuantity =
      limit === 0
        ? (existing?.quantity ?? 0)
        : Math.min(requestedQuantity, limit)

    if (appliedQuantity < requestedQuantity) {
      adjustments.push({
        nftId: guestItem.nftId,
        editionId: guestItem.editionId,
        requestedQuantity,
        appliedQuantity,
      })
    }

    if (limit === 0) continue

    if (existing) {
      existing.quantity = appliedQuantity
    } else {
      userCart.items.push({ ...guestItem, quantity: appliedQuantity })
    }
  }

  userCart.couponCode ??= guestCart.couponCode
  db.carts = db.carts.filter((candidate) => candidate.id !== guestCart.id)

  return { cart: userCart, adjustments }
}
