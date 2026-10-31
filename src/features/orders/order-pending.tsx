import { Link } from "@tanstack/react-router"
import { Loader2Icon } from "lucide-react"

import type { Order } from "@/contracts"
import { formatEth } from "@/features/cart/format"
import { networkLabel } from "@/features/wallets/labels"
import { useConnectionStatus } from "@/realtime/connection-status"

export function OrderPending({ order }: { order: Order }) {
  const connection = useConnectionStatus()

  return (
    <section className="mx-auto flex max-w-[578px] flex-col items-center gap-4 py-16 text-center">
      <Loader2Icon
        aria-hidden="true"
        className="size-10 text-primary motion-safe:animate-spin"
      />
      <h1 className="text-[20px]/6 font-bold">Pedido em processamento</h1>
      <p className="text-[14px]/6 text-muted-foreground">
        Aguardando a confirmação na rede {networkLabel(order.snapshot.network)}.
        Você pode sair desta página: o pedido continua, e nenhuma nova compra é
        criada.
      </p>
      <p className="text-[15px]/5 font-bold text-brand-text">
        Total: {formatEth(order.snapshot.totalEth)}
      </p>
      <p className="text-[13px]/5 text-muted-foreground">
        {connection === "disconnected"
          ? "Sem conexão em tempo real. Seguimos consultando o pedido."
          : "Você verá o resultado aqui, sem recarregar."}
      </p>
      <Link to="/" className="text-[14px]/5 text-brand-text underline">
        Voltar ao catálogo
      </Link>
    </section>
  )
}
