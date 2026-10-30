import { http } from "msw"

import { quote, quoteRequest } from "@/contracts"
import { updateDb } from "@/mocks/db/store"
import { requireUser } from "@/mocks/http/auth"
import { ok, readBody, route } from "@/mocks/http/respond"
import { assertCartPurchasable, createQuote } from "@/mocks/services/quotes"

export const quoteHandlers = [
  http.post(
    "/api/quotes",
    route(async ({ request }) => {
      const input = await readBody(request, quoteRequest)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
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
