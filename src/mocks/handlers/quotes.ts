import { http } from "msw"

import { quote, quoteRequest } from "@/contracts"
import { readDb, updateDb } from "@/mocks/db/store"
import { requireUser } from "@/mocks/http/auth"
import { ok, readBody, route } from "@/mocks/http/respond"
import { settleDueOrders } from "@/mocks/services/orders"
import {
  assertCartPurchasable,
  assertNoPendingOrder,
  createQuote,
} from "@/mocks/services/quotes"

export const quoteHandlers = [
  http.post(
    "/api/quotes",
    route(async ({ request }) => {
      requireUser(readDb(), request)
      const input = await readBody(request, quoteRequest)
      settleDueOrders()
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        assertNoPendingOrder(db, user.id)
        const cart = assertCartPurchasable(
          db,
          db.carts.find((candidate) => candidate.userId === user.id) ?? null
        )
        return createQuote(db, user.id, cart, input.network)
      })
      return ok(quote, result, { status: 201 })
    })
  ),
]
