import * as z from "zod/mini"

import {
  ethAmount,
  isoDateTime,
  type EventEnvelope,
  type OrderStatus,
} from "@/contracts"
import { setClock as setDbClock } from "@/mocks/db/clock"
import { readDb, resetDb, updateDb } from "@/mocks/db/store"
import { scenarioName } from "@/mocks/scenarios"
import { resetSequences } from "@/mocks/scenarios/apply"
import { readConfig, resetConfig, updateConfig } from "@/mocks/scenarios/config"
import { dispatchEvents } from "@/mocks/services/events"
import { updateNft } from "@/mocks/services/nfts"
import { settleDueOrders, settleOrder } from "@/mocks/services/orders"
import {
  dropConnections,
  emitToAll,
  emitToUser,
  getConnectionCount,
} from "@/mocks/socket/link"

type SettledStatus = Exclude<OrderStatus, "pending">

const nftChange = z.object({
  priceEth: z.optional(ethAmount),
  previousPriceEth: z.optional(ethAmount),
  editionId: z.optional(z.string()),
  available: z.optional(z.nullable(z.number().check(z.int(), z.gte(0)))),
})

const orderChange = z.object({
  status: z.enum(["confirmed", "declined"]),
})

type NftChange = z.infer<typeof nftChange>

function setScenario(name: string) {
  const parsed = scenarioName.safeParse(name)
  if (!parsed.success) throw new Error(`Cenário desconhecido: ${name}`)
  updateConfig({ scenario: parsed.data, consumed: false })
  resetSequences()
}

function emitNftUpdate(nftId: string, change: NftChange) {
  const event = updateDb((db) =>
    updateNft(db, nftId, (nft) => {
      if (change.priceEth !== undefined) {
        nft.previousPriceEth = change.previousPriceEth ?? nft.priceEth
        nft.priceEth = change.priceEth
      }
      const edition = nft.editions.find((item) => item.id === change.editionId)
      if (edition && change.available !== undefined) {
        edition.available = change.available
      }
    })
  )
  dispatchEvents([event])
}

function emitOrderUpdate(orderId: string, status: SettledStatus) {
  const events = updateDb((db) => {
    const order = db.orders.find((item) => item.id === orderId)
    return order ? settleOrder(db, order, status) : []
  })
  dispatchEvents(events)
}

export const mockControl = {
  scenario: setScenario,

  latency(ms: number) {
    if (!Number.isFinite(ms)) throw new Error(`Latência inválida: ${ms}`)
    updateConfig({ latencyMs: Math.max(ms, 0) })
  },

  emit(type: EventEnvelope["type"], resourceId: string, data: object) {
    if (type === "nft.updated") {
      emitNftUpdate(resourceId, nftChange.parse(data))
      return
    }
    emitOrderUpdate(resourceId, orderChange.parse(data).status)
  },

  emitRaw(envelope: EventEnvelope) {
    if (envelope.type === "nft.updated") {
      emitToAll(envelope)
      return
    }
    const order = readDb().orders.find(
      (item) => item.id === envelope.resourceId
    )
    if (order) emitToUser(order.userId, envelope)
  },

  dropConnection() {
    updateConfig({ connectionBlocked: true })
    dropConnections()
  },

  restoreConnection() {
    updateConfig({ connectionBlocked: false })
  },

  reset() {
    resetDb()
    resetConfig()
    resetSequences()
    dropConnections()
  },

  setClock(iso: string) {
    const validIso = isoDateTime.parse(iso)
    updateDb((db) => setDbClock(db, validIso))
    settleDueOrders()
  },

  settlePending(outcome?: SettledStatus) {
    const events = updateDb((db) =>
      db.orders
        .filter((order) => order.status === "pending")
        .flatMap((order) => settleOrder(db, order, outcome))
    )
    dispatchEvents(events)
  },

  async createSocketClient() {
    const { createSocket } = await import("@/realtime/socket")
    return createSocket()
  },

  state() {
    const { scenario, latencyMs, connectionBlocked } = readConfig()
    return {
      ...readDb(),
      mock: {
        scenario,
        latencyMs,
        connectionBlocked,
        connectionCount: getConnectionCount(),
      },
    }
  },
}

export function applyUrlScenario(name: string) {
  if (scenarioName.safeParse(name).success) setScenario(name)
}

declare global {
  interface Window {
    __mocks?: typeof mockControl
  }
}
