import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ApiError } from "@/api/errors"
import { buttonVariants } from "@/components/ui/button"
import { AccountError } from "@/features/account/account-states"
import { useAuthenticatedUser } from "@/features/auth/authenticated-user"
import { useSession } from "@/features/auth/session"
import { OrderDeclined } from "@/features/orders/order-declined"
import { OrderPending } from "@/features/orders/order-pending"
import { OrderReceipt } from "@/features/orders/order-receipt"
import { OrderSkeleton } from "@/features/orders/order-skeleton"
import { orderOptions, useOrderSettlement } from "@/features/orders/queries"

const STATUS_ANNOUNCEMENTS = {
  pending: "Pedido em processamento.",
  confirmed: "Pedido confirmado.",
  declined: "Pagamento recusado.",
}

function OrderUnavailable({ isForbidden }: { isForbidden: boolean }) {
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-[20px]/6 font-bold">
        {isForbidden
          ? "Você não tem acesso a este pedido"
          : "Pedido não encontrado"}
      </h1>
      <Link to="/" className={buttonVariants()}>
        Voltar ao catálogo
      </Link>
    </section>
  )
}

export function OrderPage({ orderId }: { orderId: string }) {
  const user = useAuthenticatedUser()
  const { data: session } = useSession()
  const {
    data: order,
    error,
    refetch,
  } = useQuery({
    ...orderOptions(user.id, orderId),
    enabled: Boolean(session),
  })

  useOrderSettlement(user.id, order)

  if (!order && error instanceof ApiError && !error.transient) {
    if (error.status === 403 || error.status === 404) {
      return <OrderUnavailable isForbidden={error.status === 403} />
    }
  }

  if (!order && error) {
    return (
      <AccountError
        title="Não foi possível carregar o pedido"
        onRetry={() => void refetch()}
      />
    )
  }

  if (!order) return <OrderSkeleton />

  return (
    <>
      <p role="status" className="sr-only">
        {STATUS_ANNOUNCEMENTS[order.status]}
      </p>
      {order.status === "pending" && <OrderPending order={order} />}
      {order.status === "declined" && <OrderDeclined />}
      {order.status === "confirmed" && <OrderReceipt order={order} />}
    </>
  )
}
