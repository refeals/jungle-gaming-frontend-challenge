const WALLETS_RETURNS = ["/checkout", "/checkout?step=wallet"] as const

export type WalletsReturn = (typeof WALLETS_RETURNS)[number]

export function isWalletsReturn(value: unknown): value is WalletsReturn {
  return WALLETS_RETURNS.includes(value as WalletsReturn)
}
