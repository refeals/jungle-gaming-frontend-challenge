import * as z from "zod/mini"

import type { Profile, Wallet } from "@/contracts"
import {
  addressOrEns,
  email,
  network,
  requiredEnsName,
  requiredText,
} from "@/contracts/common"
import { walletSlot, walletType } from "@/contracts/wallet"

const detailsShape = {
  displayName: requiredText,
  username: requiredText,
  profileName: requiredText,
  email,
  ensName: requiredEnsName,
  secondaryAddress: z.string().check(
    z.refine((value) => !value || addressOrEns.safeParse(value).success, {
      error: "Informe um endereço 0x ou um nome .eth",
    })
  ),
  referralCode: requiredText,
  note: z.string(),
}

export const checkoutDetails = z.object(detailsShape)

export const checkoutFormInput = z.object({
  ...detailsShape,
  walletSlot,
  network,
  walletType,
})

export type CheckoutValues = z.infer<typeof checkoutFormInput>
export type CheckoutField = keyof CheckoutValues

export const DETAIL_FIELDS = Object.keys(detailsShape) as CheckoutField[]
const ALL_FIELDS = Object.keys(checkoutFormInput.shape) as CheckoutField[]

export function connectedValues(wallet: Wallet) {
  return {
    walletSlot: wallet.slot,
    network: wallet.connectedNetwork ?? wallet.network,
    walletType: wallet.connectedWalletType ?? wallet.walletType,
  }
}

export function findWallet(wallets: Wallet[], slot: Wallet["slot"]) {
  return wallets.find((wallet) => wallet.slot === slot)
}

export function initialWalletValues(
  wallets: Wallet[],
  draft: Record<string, unknown>
) {
  const drafted = walletSlot.safeParse(draft.walletSlot)
  const fromDraft = drafted.success && findWallet(wallets, drafted.data)
  return connectedValues(
    fromDraft ||
      wallets.find((wallet) => wallet.status === "connected") ||
      findWallet(wallets, "primary") ||
      wallets[0]
  )
}

export function toPrefill(
  profile: Profile,
  wallets: Wallet[],
  walletValues: ReturnType<typeof connectedValues>
): CheckoutValues {
  const primary = findWallet(wallets, "primary") ?? wallets[0]

  return {
    displayName: profile.displayName,
    username: profile.username,
    profileName: primary.profileName,
    email: profile.email,
    ensName: profile.ensName ?? primary.ensName ?? "",
    secondaryAddress: primary.secondaryAddress ?? "",
    referralCode: primary.referralCode ?? "",
    note: "",
    ...walletValues,
  }
}

export function applyDraft(
  prefill: CheckoutValues,
  draft: Record<string, unknown>
): CheckoutValues {
  const restored = { ...prefill }

  for (const field of ALL_FIELDS) {
    const parsed = checkoutFormInput.shape[field].safeParse(draft[field])
    const isText = field in detailsShape && typeof draft[field] === "string"
    if (isText) Object.assign(restored, { [field]: draft[field] })
    else if (parsed.success) Object.assign(restored, { [field]: parsed.data })
  }

  return restored
}

export function toDraft(
  values: Partial<CheckoutValues>,
  prefill: CheckoutValues
) {
  const draft: Record<string, string> = {}
  if (values.walletSlot) draft.walletSlot = values.walletSlot

  for (const field of ALL_FIELDS) {
    const value = values[field]
    if (typeof value === "string" && value !== prefill[field]) {
      draft[field] = value
    }
  }

  return draft
}
