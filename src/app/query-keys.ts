import type { NftListQuery } from "@/contracts"

export type CartOwner = `user:${string}` | `guest:${string}`

export const queryKeys = {
  session: ["session"] as const,
  user: {
    all: ["user"] as const,
    favorites: (userId: string) => ["user", userId, "favorites"] as const,
    profile: (userId: string) => ["user", userId, "profile"] as const,
    wallets: (userId: string) => ["user", userId, "wallets"] as const,
  },
  nfts: {
    all: ["nfts"] as const,
    lists: ["nfts", "list"] as const,
    list: (query: NftListQuery) => ["nfts", "list", query] as const,
    detail: (nftId: string) => ["nfts", "detail", nftId] as const,
    reviews: (nftId: string) => ["nfts", "reviews", nftId] as const,
    featured: ["nfts", "featured"] as const,
  },
  cart: {
    all: ["cart"] as const,
    detail: (owner: CartOwner) => ["cart", owner] as const,
  },
  quote: {
    all: ["quote"] as const,
    detail: (userId: string) => ["quote", userId] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (userId: string, orderId: string) =>
      ["orders", userId, orderId] as const,
  },
}
