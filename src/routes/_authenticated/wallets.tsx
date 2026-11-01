import { createFileRoute } from "@tanstack/react-router"

import { AccountLayout } from "@/features/account/account-layout"
import {
  isWalletsReturn,
  type WalletsReturn,
} from "@/features/wallets/wallets-return"
import { WalletsPage } from "@/features/wallets/wallets-page"

function WalletsRoute() {
  return (
    <AccountLayout>
      <WalletsPage returnTo={Route.useSearch().returnTo} />
    </AccountLayout>
  )
}

export const Route = createFileRoute("/_authenticated/wallets")({
  validateSearch: (
    search: Record<string, unknown>
  ): { returnTo?: WalletsReturn } => ({
    returnTo: isWalletsReturn(search.returnTo) ? search.returnTo : undefined,
  }),
  component: WalletsRoute,
})
