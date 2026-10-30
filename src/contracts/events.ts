import * as z from "zod/mini"

import { ethAmount } from "@/contracts/common"
import { edition } from "@/contracts/nft"
import { orderStatus } from "@/contracts/order"

const envelopeFields = {
  eventId: z.string(),
  resourceId: z.string(),
  version: z.number(),
}

export const nftUpdatedEvent = z.object({
  ...envelopeFields,
  type: z.literal("nft.updated"),
  data: z.object({
    priceEth: ethAmount,
    previousPriceEth: z.optional(ethAmount),
    editions: z.array(edition),
  }),
})

export const orderUpdatedEvent = z.object({
  ...envelopeFields,
  type: z.literal("order.updated"),
  data: z.object({
    status: orderStatus,
    transactionRef: z.nullable(z.string()),
  }),
})

export const eventEnvelope = z.discriminatedUnion("type", [
  nftUpdatedEvent,
  orderUpdatedEvent,
])

export const sessionJoinPayload = z.object({
  token: z.string(),
})
