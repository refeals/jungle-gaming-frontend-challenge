import * as z from "zod/mini"

import { http } from "@/api/http"
import type { ConnectWalletInput, WalletInput } from "@/contracts"
import { wallet, walletConnection } from "@/contracts/wallet"

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

export async function connectWallet(
  walletId: string,
  input: ConnectWalletInput
) {
  const { data } = await http.post<unknown>(
    `/wallets/${encodeURIComponent(walletId)}/connect`,
    input
  )
  return walletConnection.parse(data)
}

export async function disconnectWallet(walletId: string) {
  const { data } = await http.post<unknown>(
    `/wallets/${encodeURIComponent(walletId)}/disconnect`
  )
  return walletConnection.parse(data)
}
