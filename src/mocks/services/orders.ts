import type { CreateOrderInput, OrderStatus } from "@/contracts"
import { now } from "@/mocks/db/clock"
import type { MockDb } from "@/mocks/db/schema"
import { readDb, updateDb } from "@/mocks/db/store"
import { fail } from "@/mocks/http/failure"
import { dispatchEvents, type PendingEvent } from "@/mocks/services/events"
import { nextId } from "@/mocks/services/ids"
import { changeAvailability } from "@/mocks/services/nfts"
import {
  assertCartPurchasable,
  createQuote,
  isQuoteCurrent,
} from "@/mocks/services/quotes"

type DbOrder = MockDb["orders"][number]

type CreateOrderArgs = {
  userId: string
  input: CreateOrderInput
  idempotencyKey: string
  contentHash: string
  plannedOutcome: DbOrder["plannedOutcome"]
  settleDelayMs: number
}

export type CreateOrderResult =
  | { kind: "replayed"; order: DbOrder }
  | { kind: "created"; order: DbOrder; events: PendingEvent[] }
  | { kind: "stale"; quote: MockDb["quotes"][number] }

export function createOrder(
  db: MockDb,
  args: CreateOrderArgs
): CreateOrderResult {
  const {
    userId,
    input,
    idempotencyKey,
    contentHash,
    plannedOutcome,
    settleDelayMs,
  } = args

  const previous = db.idempotency.find(
    (entry) => entry.key === idempotencyKey && entry.userId === userId
  )
  if (previous) {
    if (previous.contentHash !== contentHash) {
      fail(
        409,
        "idempotency_conflict",
        "Esta tentativa já foi usada em outro pedido."
      )
    }
    const order = db.orders.find((item) => item.id === previous.orderId)
    if (order) return { kind: "replayed", order }
  }

  const cart = assertCartPurchasable(
    db,
    db.carts.find((candidate) => candidate.userId === userId) ?? null
  )

  const quote = db.quotes.find(
    (item) => item.quoteId === input.quoteId && item.userId === userId
  )
  if (!quote || !isQuoteCurrent(db, quote, cart)) {
    const ownWallet = db.wallets.find(
      (item) => item.id === input.walletId && item.userId === userId
    )
    const network =
      quote?.network ?? ownWallet?.connectedNetwork ?? ownWallet?.network
    return {
      kind: "stale",
      quote: createQuote(db, userId, cart, network ?? "ethereum"),
    }
  }

  const wallet =
    db.wallets.find((item) => item.id === input.walletId) ??
    fail(404, "not_found", "Carteira não encontrada.")
  if (wallet.userId !== userId) {
    fail(403, "forbidden", "Esta carteira pertence a outro usuário.")
  }
  if (
    wallet.status !== "connected" ||
    wallet.connectedNetwork !== quote.network
  ) {
    fail(409, "wallet_not_connected", "Conecte a carteira na rede selecionada.")
  }

  const createdAt = now(db)
  const order: DbOrder = {
    id: nextId(db, "order"),
    userId,
    plannedOutcome,
    status: "pending",
    version: 1,
    createdAt: createdAt.toISOString(),
    settleAt: new Date(createdAt.getTime() + settleDelayMs).toISOString(),
    transactionRef: null,
    snapshot: {
      lines: quote.lines,
      couponCode: quote.couponCode,
      network: quote.network,
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      feeEth: quote.feeEth,
      totalEth: quote.totalEth,
      walletAddress: wallet.address,
      walletType: wallet.walletType,
      collector: input.collector,
    },
  }

  db.orders.push(order)
  db.idempotency.push({
    key: idempotencyKey,
    userId,
    contentHash,
    orderId: order.id,
  })
  db.quotes = db.quotes.filter((item) => item.quoteId !== quote.quoteId)

  const events = quote.lines.map((line) =>
    changeAvailability(db, line.nftId, line.editionId, -line.quantity)
  )

  return { kind: "created", order, events }
}

function removePurchasedItems(db: MockDb, order: DbOrder) {
  const cart = db.carts.find((candidate) => candidate.userId === order.userId)
  if (!cart) return

  for (const line of order.snapshot.lines) {
    const item = cart.items.find(
      (candidate) =>
        candidate.nftId === line.nftId && candidate.editionId === line.editionId
    )
    if (item) item.quantity -= line.quantity
  }

  cart.items = cart.items.filter((item) => item.quantity > 0)
  if (cart.items.length === 0) cart.couponCode = null
}

export function settleOrder(
  db: MockDb,
  order: DbOrder,
  outcome: Exclude<OrderStatus, "pending"> = order.plannedOutcome
): PendingEvent[] {
  if (order.status !== "pending") return []

  order.status = outcome
  order.version += 1

  let nftEvents: PendingEvent[] = []

  if (outcome === "confirmed") {
    db.sequence += 1
    order.transactionRef = `0x${String(db.sequence).padStart(64, "0")}`
    removePurchasedItems(db, order)
  } else {
    nftEvents = order.snapshot.lines.map((line) =>
      changeAvailability(db, line.nftId, line.editionId, line.quantity)
    )
  }

  return [
    {
      userId: order.userId,
      envelope: {
        eventId: nextId(db, `order.updated:${order.id}:${order.version}`),
        type: "order.updated",
        resourceId: order.id,
        version: order.version,
        data: { status: order.status, transactionRef: order.transactionRef },
      },
    },
    ...nftEvents,
  ]
}

export function settleDueOrders() {
  const current = readDb()
  const isDue = (order: DbOrder) =>
    order.status === "pending" && new Date(order.settleAt) <= now(current)
  if (!current.orders.some(isDue)) return

  dispatchEvents(
    updateDb((db) =>
      db.orders
        .filter((order) => order.status === "pending")
        .filter((order) => new Date(order.settleAt) <= now(db))
        .flatMap((order) => settleOrder(db, order))
    )
  )
}

export function scheduleSettlement(orderId: string) {
  const db = readDb()
  const order = db.orders.find((item) => item.id === orderId)
  if (order?.status !== "pending") return

  const delay = new Date(order.settleAt).getTime() - now(db).getTime()
  setTimeout(
    () => {
      settleDueOrders()
      scheduleSettlement(orderId)
    },
    Math.max(delay, 0)
  )
}

export function resumePendingOrders() {
  settleDueOrders()
  readDb()
    .orders.filter((order) => order.status === "pending")
    .forEach((order) => scheduleSettlement(order.id))
}
