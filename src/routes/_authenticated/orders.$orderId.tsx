import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { getOrder } from "@/api/orders"
import { queryKeys } from "@/app/query-keys"
import { useAuthenticatedUser } from "@/features/auth/authenticated-user"

const STATUS_LABELS = {
  pending: "Pedido em processamento",
  confirmed: "Pedido confirmado",
  declined: "Pedido recusado",
}

function OrderRoute() {
  const { orderId } = Route.useParams()
  const user = useAuthenticatedUser()
  const { data: order, isError } = useQuery({
    queryKey: queryKeys.orders.detail(user.id, orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    refetchInterval: ({ state }) =>
      state.data?.status === "pending" ? 5000 : false,
  })

  return (
    <section className="py-24 text-center">
      <h1 className="text-[20px]/6 font-bold">
        {order && STATUS_LABELS[order.status]}
        {!order && (isError ? "Pedido não encontrado" : "Carregando pedido")}
      </h1>
      {order && <p className="mt-2 text-[14px]/5">{order.id}</p>}
    </section>
  )
}

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: OrderRoute,
})
