const ZERO_DECIMAL = /^0*(\.0*)?$/

export function formatEth(value: string) {
  return `${value} ETH`
}

export function isZeroEth(value: string) {
  return ZERO_DECIMAL.test(value)
}

export function formatDiscount(value: string) {
  return isZeroEth(value) ? "(-) 00.00" : `(-) ${formatEth(value)}`
}
