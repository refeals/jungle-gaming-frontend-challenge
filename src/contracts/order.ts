import * as z from "zod/mini"

import {
  addressOrEns,
  email,
  ensName,
  ethAddress,
  ethAmount,
  isoDateTime,
  network,
  requiredText,
} from "@/contracts/common"
import { quoteLine } from "@/contracts/quote"
import { walletType } from "@/contracts/wallet"

export const orderStatus = z.enum(["pending", "confirmed", "declined"])

export const collectorDetails = z.object({
  displayName: requiredText,
  username: requiredText,
  email,
  profileName: requiredText,
  ensName: z.nullable(ensName),
  secondaryAddress: z.nullable(addressOrEns),
  referralCode: z.nullable(z.string()),
  note: z.nullable(z.string()),
})

export const createOrderInput = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  collector: collectorDetails,
})

export const orderSnapshot = z.object({
  lines: z.array(quoteLine),
  couponCode: z.nullable(z.string()),
  network,
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  feeEth: ethAmount,
  totalEth: ethAmount,
  walletAddress: ethAddress,
  walletType,
  collector: collectorDetails,
})

export const order = z.object({
  id: z.string(),
  status: orderStatus,
  version: z.number(),
  createdAt: isoDateTime,
  settleAt: isoDateTime,
  transactionRef: z.nullable(z.string()),
  snapshot: orderSnapshot,
})
