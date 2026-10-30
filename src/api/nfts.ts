import { http } from "@/api/http"
import type { NftListQuery } from "@/contracts"
import { nft, nftListResponse, nftReviewList } from "@/contracts/nft"

export async function listNfts(query: NftListQuery, signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/nfts", { params: query, signal })
  return nftListResponse.parse(data)
}

export async function getNft(nftId: string, signal?: AbortSignal) {
  const { data } = await http.get<unknown>(
    `/nfts/${encodeURIComponent(nftId)}`,
    { signal }
  )
  return nft.parse(data)
}

export async function getFeaturedNft(signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/nfts/featured", { signal })
  return nft.parse(data)
}

export async function getNftReviews(nftId: string, signal?: AbortSignal) {
  const { data } = await http.get<unknown>(
    `/nfts/${encodeURIComponent(nftId)}/reviews`,
    { signal }
  )
  return nftReviewList.parse(data).items
}
