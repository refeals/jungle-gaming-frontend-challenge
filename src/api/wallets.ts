import * as z from "zod/mini"

import { http } from "@/api/http"
import type { WalletInput } from "@/contracts"
import { wallet } from "@/contracts/wallet"

export async function getWallets(signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/wallets", { signal })
  return z.array(wallet).parse(data)
}

export async function createWallet(input: WalletInput) {
  const { data } = await http.post<unknown>("/wallets", input)
  return wallet.parse(data)
}

export async function updateWallet(walletId: string, input: WalletInput) {
  const { data } = await http.patch<unknown>(
    `/wallets/${encodeURIComponent(walletId)}`,
    input
  )
  return wallet.parse(data)
}
