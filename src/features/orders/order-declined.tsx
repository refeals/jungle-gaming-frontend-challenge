import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

export function OrderDeclined() {
  return (
    <section className="mx-auto flex max-w-[578px] flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-[20px]/6 font-bold">Pagamento recusado</h1>
      <p className="text-[14px]/6 text-muted-foreground">
        A carteira ou a rede recusou o pagamento, e nada foi cobrado. Seus itens
        continuam no carrinho.
      </p>
      <Link to="/checkout" className={buttonVariants()}>
        Voltar ao pagamento
      </Link>
    </section>
  )
}
