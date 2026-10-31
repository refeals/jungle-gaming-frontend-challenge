import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/api/errors"
import { queryKeys } from "@/app/query-keys"

const MAX_QUERY_RETRIES = 2

export const staleTimes = {
  nft: 30_000,
  session: 5 * 60_000,
  cart: 0,
  favorites: 0,
  profile: 0,
  wallets: 0,
  quote: Infinity,
  pendingOrder: 0,
  settledOrder: Infinity,
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < MAX_QUERY_RETRIES &&
        error instanceof ApiError &&
        error.transient,
    },
    mutations: {
      retry: false,
      networkMode: "always",
    },
  },
})

queryClient.setQueryDefaults(queryKeys.cart.seen, { gcTime: Infinity })
