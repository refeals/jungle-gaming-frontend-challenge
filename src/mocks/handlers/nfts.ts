import { http } from "msw"

import { nft, nftListQuery, nftListResponse } from "@/contracts"
import { readDb } from "@/mocks/db/store"
import { ok, pathParam, readQuery, route } from "@/mocks/http/respond"
import { isCatalogEmpty } from "@/mocks/scenarios/apply"
import { listNfts } from "@/mocks/services/catalog"
import { findNft } from "@/mocks/services/nfts"

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
    "/api/nfts/:id",
    route(({ params }) => ok(nft, findNft(readDb(), pathParam(params, "id"))))
  ),
]
