import type { Network, Wallet } from "@/contracts"

export const networkItems: { value: Network; label: string }[] = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
]

export const walletTypeItems: { value: Wallet["walletType"]; label: string }[] =
  [
    { value: "metamask", label: "MetaMask" },
    { value: "walletconnect", label: "WalletConnect" },
    { value: "coinbase", label: "Coinbase Wallet" },
  ]

export function networkLabel(network: Network) {
  return networkItems.find(({ value }) => value === network)?.label ?? network
}

export function walletTypeLabel(type: Wallet["walletType"]) {
  return walletTypeItems.find(({ value }) => value === type)?.label ?? type
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
