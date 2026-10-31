import { http } from "@/api/http"
import type { CreateOrderInput } from "@/contracts"
import { order } from "@/contracts/order"

export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string
) {
  const { data } = await http.post<unknown>("/orders", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  })
  return order.parse(data)
}

export async function getOrder(orderId: string, signal?: AbortSignal) {
  const { data } = await http.get<unknown>(
    `/orders/${encodeURIComponent(orderId)}`,
    { signal }
  )
  return order.parse(data)
}
