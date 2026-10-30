import { http } from "msw"

import { createOrderInput, order as orderSchema, quote } from "@/contracts"
import { sha256Hex } from "@/mocks/db/password"
import { readDb, updateDb } from "@/mocks/db/store"
import { requireUser } from "@/mocks/http/auth"
import { fail, ok, pathParam, readBody, route } from "@/mocks/http/respond"
import { plannedOrderOutcome, settleDelayMs } from "@/mocks/scenarios/apply"
import { dispatchEvents } from "@/mocks/services/events"
import {
  createOrder,
  scheduleSettlement,
  settleDueOrders,
} from "@/mocks/services/orders"

export const orderHandlers = [
  http.post(
    "/api/orders",
    route(async ({ request }) => {
      const userId = requireUser(readDb(), request).id
      const idempotencyKey = request.headers.get("Idempotency-Key")
      if (!idempotencyKey) {
        fail(400, "validation_error", "Idempotency-Key é obrigatório.")
      }

      const input = await readBody(request, createOrderInput)
      const contentHash = await sha256Hex(JSON.stringify(input))

      const result = updateDb((db) =>
        createOrder(db, {
          userId,
          input,
          idempotencyKey,
          contentHash,
          plannedOutcome: plannedOrderOutcome(),
          settleDelayMs: settleDelayMs(),
        })
      )

      if (result.kind === "stale") {
        fail(409, "quote_stale", "Os valores mudaram. Revise o pedido.", {
          details: { quote: quote.parse(result.quote) },
        })
      }

      if (result.kind === "replayed") return ok(orderSchema, result.order)

      dispatchEvents(result.events)
      scheduleSettlement(result.order.id)
      return ok(orderSchema, result.order, { status: 201 })
    })
  ),

  http.get(
    "/api/orders/:id",
    route(({ request, params }) => {
      settleDueOrders()
      const db = readDb()
      const user = requireUser(db, request)
      const order =
        db.orders.find((item) => item.id === pathParam(params, "id")) ??
        fail(404, "not_found", "Pedido não encontrado.")

      if (order.userId !== user.id) {
        fail(403, "forbidden", "Este pedido pertence a outro usuário.")
      }

      return ok(orderSchema, order)
    })
  ),
]
