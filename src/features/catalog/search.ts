import * as z from "zod/mini"

import type { NftListQuery } from "@/contracts"
import { ethAmount, network, nftCategory } from "@/contracts/common"
import { nftPage, nftSort, nftTab } from "@/contracts/nft"

function lenient<Schema extends z.ZodMiniType>(schema: Schema) {
  return z.catch(z.optional(schema), undefined)
}

const catalogSearchSchema = z.object({
  tab: lenient(nftTab),
  collection: lenient(nftCategory),
  network: lenient(network),
  minPrice: lenient(ethAmount),
  maxPrice: lenient(ethAmount),
  sort: lenient(nftSort),
  q: lenient(z.string()),
  page: lenient(nftPage),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function validateCatalogSearch(
  search: Record<string, unknown>
): CatalogSearch {
  const parsed = catalogSearchSchema.parse(search)

  return {
    ...parsed,
    tab: parsed.tab === "all" ? undefined : parsed.tab,
    sort: parsed.sort === "recent" ? undefined : parsed.sort,
    q: parsed.q?.trim() || undefined,
    page: parsed.page === 1 ? undefined : parsed.page,
  }
}

export function toListQuery(search: CatalogSearch): NftListQuery {
  return {
    tab: search.tab ?? "all",
    collection: search.collection,
    network: search.network,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort ?? "recent",
    q: search.q,
    page: search.page ?? 1,
  }
}
