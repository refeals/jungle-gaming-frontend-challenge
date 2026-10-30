import { createFileRoute } from "@tanstack/react-router"

function FavoritesPage() {
  return <h1 className="py-24 text-center text-[28px] font-bold">Favoritos</h1>
}

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
})
