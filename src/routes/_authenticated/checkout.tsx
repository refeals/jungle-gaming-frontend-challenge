import { createFileRoute, Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

function CheckoutPage() {
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-[28px]/9 font-bold">Pagamento</h1>
      <p className="text-[14px]/6 text-muted-foreground">Em breve</p>
      <Link to="/cart" className={buttonVariants()}>
        Voltar ao carrinho
      </Link>
    </section>
  )
}

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
})
