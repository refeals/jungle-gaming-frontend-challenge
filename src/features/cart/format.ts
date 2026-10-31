const ZERO_DECIMAL = /^0*(\.0*)?$/

export function formatEth(value: string) {
  return `${value} ETH`
}

export function formatDiscount(value: string) {
  return ZERO_DECIMAL.test(value) ? "(-) 00.00" : `(-) ${formatEth(value)}`
}
