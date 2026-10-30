import type { NftListQuery } from "@/contracts"

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
  cart: ["cart"] as const,
  quote: ["quote"] as const,
}
