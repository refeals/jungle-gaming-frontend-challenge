import { useQuery } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

import { ApiError } from "@/api/errors"
import { notify } from "@/lib/notify"
import { orderOptions, useOrderSettlement } from "@/features/orders/queries"
import { clearPendingOrderId } from "@/features/orders/pending-order-storage"

export function PendingOrderBanner({
  userId,
  orderId,
}: {
  userId: string
  orderId: string
}) {
  const router = useRouter()
  const { data: order, error } = useQuery(orderOptions(userId, orderId))
  const status = order?.status
  const isGone =
    error instanceof ApiError && (error.status === 403 || error.status === 404)

  useOrderSettlement(userId, order)

  useEffect(() => {
    if (isGone) clearPendingOrderId()
  }, [isGone])

  useEffect(() => {
    if (status !== "confirmed" && status !== "declined") return

    notify(
      status === "confirmed"
        ? "Seu pedido foi confirmado."
        : "Seu pagamento foi recusado.",
      {
        label: "Ver pedido",
        onClick: () =>
          void router.navigate({
            to: "/orders/$orderId",
            params: { orderId },
          }),
      }
    )
  }, [orderId, router, status])

  if (status === "confirmed" || status === "declined" || isGone) return null

  return (
    <p
      role="status"
      className="mt-3 flex flex-wrap items-center justify-center gap-x-3 rounded-[6px] border border-primary bg-card px-4 py-2 text-center text-[14px]/5"
    >
      Você tem um pedido em processamento
      <Link
        to="/orders/$orderId"
        params={{ orderId }}
        className="font-bold text-brand-text underline"
      >
        Ver pedido
      </Link>
    </p>
  )
}
