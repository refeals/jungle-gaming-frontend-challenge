import { http } from "msw"

import { authHandlers } from "@/mocks/handlers/auth"
import { cartHandlers } from "@/mocks/handlers/cart"
import { favoriteHandlers } from "@/mocks/handlers/favorites"
import { nftHandlers } from "@/mocks/handlers/nfts"
import { orderHandlers } from "@/mocks/handlers/orders"
import { profileHandlers } from "@/mocks/handlers/profile"
import { quoteHandlers } from "@/mocks/handlers/quotes"
import { walletHandlers } from "@/mocks/handlers/wallets"
import { fail, route } from "@/mocks/http/respond"

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  http.all(
    "/api/*",
    route(() => fail(404, "not_found", "Recurso não encontrado."))
  ),
]
