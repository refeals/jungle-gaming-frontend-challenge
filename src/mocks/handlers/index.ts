import { authHandlers } from "@/mocks/handlers/auth"
import { cartHandlers } from "@/mocks/handlers/cart"
import { favoriteHandlers } from "@/mocks/handlers/favorites"
import { nftHandlers } from "@/mocks/handlers/nfts"
import { orderHandlers } from "@/mocks/handlers/orders"
import { profileHandlers } from "@/mocks/handlers/profile"
import { quoteHandlers } from "@/mocks/handlers/quotes"
import { walletHandlers } from "@/mocks/handlers/wallets"

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
]
