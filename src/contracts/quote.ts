import * as z from "zod/mini"

import { ethAmount, isoDateTime, network } from "@/contracts/common"
import { nftImage } from "@/contracts/nft"

export const quoteRequest = z.object({
  network,
})

export const quoteLine = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: nftImage,
  editionLabel: z.string(),
  unitPriceEth: ethAmount,
  quantity: z.number(),
  lineTotalEth: ethAmount,
})

export const quote = z.object({
  quoteId: z.string(),
  version: z.number(),
  lines: z.array(quoteLine),
  couponCode: z.nullable(z.string()),
  network,
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  feeEth: ethAmount,
  totalEth: ethAmount,
  issuedAt: isoDateTime,
  expiresAt: isoDateTime,
})
