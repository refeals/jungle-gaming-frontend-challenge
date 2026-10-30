import type { NftListQuery } from "@/contracts"

export const queryKeys = {
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
