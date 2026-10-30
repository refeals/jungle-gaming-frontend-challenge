import Big from "big.js"

import type { Network } from "@/contracts"

const ETH_DECIMALS = 18
const ZERO = "0"

export const NETWORK_FEES: Record<Network, string> = {
  ethereum: "0.016",
  polygon: "0.002",
  solana: "0.001",
}

export function add(...amounts: string[]) {
  return amounts.reduce((sum, amount) => sum.plus(amount), Big(ZERO)).toFixed()
}

export function subtract(amount: string, deducted: string) {
  return Big(amount).minus(deducted).toFixed()
}

export function multiply(amount: string, quantity: number) {
  return Big(amount).times(quantity).toFixed()
}

export function compare(left: string, right: string) {
  return Big(left).cmp(right)
}

export function percentOff(amount: string, percent: number) {
  return Big(amount)
    .times(percent)
    .div(100)
    .round(ETH_DECIMALS, Big.roundDown)
    .toFixed()
}

export function highestFee(networks: Network[]) {
  return networks.reduce(
    (highest, network) =>
      compare(NETWORK_FEES[network], highest) > 0
        ? NETWORK_FEES[network]
        : highest,
    ZERO
  )
}
