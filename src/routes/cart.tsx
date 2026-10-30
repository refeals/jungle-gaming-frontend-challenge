import { createFileRoute } from "@tanstack/react-router"

function CartPage() {
  return <h1 className="py-24 text-center text-[28px] font-bold">Carrinho</h1>
}

export const Route = createFileRoute("/cart")({
  component: CartPage,
})
