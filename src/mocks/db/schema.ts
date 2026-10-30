import * as z from "zod/mini"

import { isoDateTime, nft, order, quote, wallet } from "@/contracts"

const dbUser = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  ensName: z.nullable(z.string()),
  walletNickname: z.nullable(z.string()),
  avatarDataUrl: z.nullable(z.string()),
  passwordHash: z.string(),
  salt: z.string(),
})

const dbSession = z.object({
  token: z.string(),
  userId: z.string(),
  expiresAt: isoDateTime,
})

const dbFavorite = z.object({
  userId: z.string(),
  nftId: z.string(),
})

const dbCart = z.object({
  id: z.string(),
  userId: z.nullable(z.string()),
  couponCode: z.nullable(z.string()),
  items: z.array(
    z.object({
      id: z.string(),
      nftId: z.string(),
      editionId: z.string(),
      quantity: z.number(),
    })
  ),
})

const dbCoupon = z.object({
  code: z.string(),
  percent: z.number(),
  expiresAt: isoDateTime,
})

const dbIdempotency = z.object({
  key: z.string(),
  userId: z.string(),
  contentHash: z.string(),
  orderId: z.string(),
})

const dbClock = z.object({
  baseIso: isoDateTime,
  anchorMs: z.nullable(z.number()),
})

export const mockDb = z.object({
  schemaVersion: z.literal(3),
  sequence: z.number(),
  users: z.array(dbUser),
  sessions: z.array(dbSession),
  nfts: z.array(nft),
  favorites: z.array(dbFavorite),
  carts: z.array(dbCart),
  quotes: z.array(z.extend(quote, { userId: z.string() })),
  orders: z.array(
    z.extend(order, {
      userId: z.string(),
      plannedOutcome: z.enum(["confirmed", "declined"]),
    })
  ),
  wallets: z.array(z.extend(wallet, { userId: z.string() })),
  idempotency: z.array(dbIdempotency),
  coupons: z.array(dbCoupon),
  clock: dbClock,
})

export type MockDb = z.infer<typeof mockDb>
