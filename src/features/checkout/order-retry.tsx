import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export function OrderRetry({
  isPending,
  onRetry,
}: {
  isPending: boolean
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-24 text-center"
    >
      <h1 className="text-[20px]/6 font-bold">Não confirmamos seu pedido</h1>
      <p className="max-w-[480px] text-[14px]/6 text-muted-foreground">
        A resposta não chegou, e o pedido pode ter sido criado. Tentar novamente
        não gera outra compra.
      </p>
      <Button
        aria-disabled={isPending || undefined}
        onClick={() => {
          if (!isPending) onRetry()
        }}
      >
        {isPending ? "Enviando..." : "Tentar novamente"}
      </Button>
      <Link to="/cart" className="text-[14px]/5 text-brand-text underline">
        Voltar ao carrinho
      </Link>
    </div>
  )
}
