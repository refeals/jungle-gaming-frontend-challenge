import * as z from "zod/mini"

import {
  addressOrEns,
  email,
  ensName,
  ethAddress,
  network,
  requiredText,
} from "@/contracts/common"

export const walletSlot = z.enum(["primary", "secondary"])

export const walletType = z.enum(["metamask", "walletconnect", "coinbase"])

export const walletStatus = z.enum(["disconnected", "connected", "rejected"])

const walletFields = {
  slot: walletSlot,
  displayName: requiredText,
  nickname: requiredText,
  network,
  profileName: requiredText,
  address: ethAddress,
  secondaryAddress: z.nullable(addressOrEns),
  walletType,
  referralCode: z.nullable(z.string()),
  email,
  ensName: z.nullable(ensName),
}

export const walletInput = z.object(walletFields)

export const wallet = z.object({
  ...walletFields,
  id: z.string(),
  status: walletStatus,
  connectedNetwork: z.nullable(network),
})

export const connectWalletInput = z.object({
  network,
})

export const walletConnection = z.object({
  walletId: z.string(),
  status: walletStatus,
  network: z.nullable(network),
})
