import { createFileRoute } from "@tanstack/react-router"

type HomeSearch = {
  collection?: string
}

function HomePage() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-[28px] font-bold">Kurio</h1>
    </div>
  )
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    collection:
      typeof search.collection === "string" ? search.collection : undefined,
  }),
  component: HomePage,
})
