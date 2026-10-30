import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { getFeaturedNft, getNft, getNftReviews, listNfts } from "@/api/nfts"
import { queryKeys } from "@/app/query-keys"
import { staleTimes } from "@/app/query-client"
import type { NftListQuery } from "@/contracts"
import { reconcileNft } from "@/realtime/applied-nft-events"

export function nftListOptions(query: NftListQuery) {
  return queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: async ({ signal }) => {
      const list = await listNfts(query, signal)
      return { ...list, items: list.items.map(reconcileNft) }
    },
    staleTime: staleTimes.nft,
    placeholderData: keepPreviousData,
  })
}

export function nftDetailOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: async ({ signal }) => reconcileNft(await getNft(nftId, signal)),
    staleTime: staleTimes.nft,
  })
}

export function featuredNftOptions() {
  return queryOptions({
    queryKey: queryKeys.nfts.featured,
    queryFn: async ({ signal }) => reconcileNft(await getFeaturedNft(signal)),
    staleTime: staleTimes.nft,
  })
}

export function nftReviewsOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.reviews(nftId),
    queryFn: ({ signal }) => getNftReviews(nftId, signal),
    staleTime: staleTimes.nft,
  })
}
