import { createFileRoute } from "@tanstack/react-router"

function WalletsPage() {
  return <h1 className="py-24 text-center text-[28px] font-bold">Carteiras</h1>
}

export const Route = createFileRoute("/_authenticated/wallets")({
  component: WalletsPage,
})
