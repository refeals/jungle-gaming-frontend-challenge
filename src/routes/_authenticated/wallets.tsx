import { createFileRoute } from "@tanstack/react-router"

import { AccountLayout } from "@/features/account/account-layout"
import { WalletsPage } from "@/features/wallets/wallets-page"

function WalletsRoute() {
  return (
    <AccountLayout>
      <WalletsPage />
    </AccountLayout>
  )
}

export const Route = createFileRoute("/_authenticated/wallets")({
  component: WalletsRoute,
})
