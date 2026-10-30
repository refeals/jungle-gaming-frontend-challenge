import { http } from "msw"

import { nft, nftListQuery, nftListResponse, nftReviewList } from "@/contracts"
import { readDb } from "@/mocks/db/store"
import { fail } from "@/mocks/http/failure"
import { ok, pathParam, readQuery, route } from "@/mocks/http/respond"
import { isCatalogEmpty } from "@/mocks/scenarios/apply"
import { listNfts } from "@/mocks/services/catalog"
import { findFeaturedNft, findNft, listReviews } from "@/mocks/services/nfts"

export const nftHandlers = [
  http.get(
    "/api/nfts",
    route(({ request }) => {
      const query = readQuery(request, nftListQuery)
      const db = readDb()
      const catalog = isCatalogEmpty() ? { ...db, nfts: [] } : db
      return ok(nftListResponse, listNfts(catalog, query))
    })
  ),

  http.get(
    "/api/nfts/featured",
    route(() => {
      if (isCatalogEmpty()) fail(404, "not_found", "NFT não encontrado.")
      return ok(nft, findFeaturedNft(readDb()))
    })
  ),

  http.get(
    "/api/nfts/:id/reviews",
    route(({ params }) => {
      const db = readDb()
      return ok(nftReviewList, {
        items: listReviews(db, findNft(db, pathParam(params, "id"))),
      })
    })
  ),

  http.get(
    "/api/nfts/:id",
    route(({ params }) => ok(nft, findNft(readDb(), pathParam(params, "id"))))
  ),
]
