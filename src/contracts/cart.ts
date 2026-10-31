import * as z from "zod/mini"

import {
  ethAmount,
  network,
  positiveQuantity,
  requiredText,
} from "@/contracts/common"
import { nftImage } from "@/contracts/nft"

export const cartItem = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: nftImage,
  editionLabel: z.string(),
  network,
  unitPriceEth: ethAmount,
  quantity: z.number(),
  lineTotalEth: ethAmount,
  maxQuantity: z.number(),
  isSoldOut: z.boolean(),
})

export const cartSummary = z.object({
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  feeEth: ethAmount,
  totalEth: ethAmount,
})

export const cart = z.object({
  id: z.nullable(z.string()),
  items: z.array(cartItem),
  couponCode: z.nullable(z.string()),
  summary: cartSummary,
})

export const addCartItemInput = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: positiveQuantity,
})

export const updateCartItemInput = z.object({
  quantity: positiveQuantity,
})

export const couponInput = z.object({
  code: requiredText,
})

export const mergeCartInput = z.object({
  guestCartId: z.string(),
})

export const mergeAdjustment = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  requestedQuantity: z.number(),
  appliedQuantity: z.number(),
})

export const mergeResult = z.object({
  cart,
  adjustments: z.array(mergeAdjustment),
})
