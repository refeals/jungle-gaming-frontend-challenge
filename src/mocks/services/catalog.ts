import type { Nft, NftFacets, NftListQuery } from "@/contracts"
import { nftCategory, network as networkSchema } from "@/contracts"
import { now } from "@/mocks/db/clock"
import { compare } from "@/mocks/db/money"
import type { MockDb } from "@/mocks/db/schema"

const PAGE_SIZE = 9
const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const TRENDING_MIN_SCORE = 70

type IgnoredFilter = "collection" | "network" | "price"

function matchesTab(db: MockDb, nft: Nft, tab: NftListQuery["tab"]) {
  if (tab === "new") {
    return now(db).getTime() - new Date(nft.listedAt).getTime() <= NEW_WINDOW_MS
  }
  if (tab === "trending") return nft.trendingScore >= TRENDING_MIN_SCORE
  return true
}

function matchesSearch(nft: Nft, q: string | undefined) {
  const term = q?.trim().toLowerCase()
  if (!term) return true
  return (
    nft.name.toLowerCase().includes(term) ||
    nft.collection.toLowerCase().includes(term)
  )
}

function matchesPrice(nft: Nft, query: NftListQuery) {
  if (query.minPrice && compare(nft.priceEth, query.minPrice) < 0) return false
  if (query.maxPrice && compare(nft.priceEth, query.maxPrice) > 0) return false
  return true
}

function filterNfts(db: MockDb, query: NftListQuery, ignored?: IgnoredFilter) {
  return db.nfts.filter(
    (nft) =>
      matchesTab(db, nft, query.tab) &&
      matchesSearch(nft, query.q) &&
      (ignored === "collection" ||
        !query.collection ||
        nft.category === query.collection) &&
      (ignored === "network" ||
        !query.network ||
        nft.network === query.network) &&
      (ignored === "price" || matchesPrice(nft, query))
  )
}

function sortNfts(nfts: Nft[], sort: NftListQuery["sort"]) {
  const sorted = [...nfts]
  sorted.sort((left, right) => {
    if (sort === "price-asc") return compare(left.priceEth, right.priceEth)
    if (sort === "price-desc") return compare(right.priceEth, left.priceEth)
    if (sort === "name") return left.name.localeCompare(right.name, "pt-BR")
    return right.listedAt.localeCompare(left.listedAt)
  })
  return sorted
}

function createFacets(db: MockDb, query: NftListQuery): NftFacets {
  const byCategory = filterNfts(db, query, "collection")
  const byNetwork = filterNfts(db, query, "network")
  const prices = filterNfts(db, query, "price")
    .map((nft) => nft.priceEth)
    .sort(compare)

  return {
    categories: nftCategory.options.map((value) => ({
      value,
      count: byCategory.filter((nft) => nft.category === value).length,
    })),
    networks: networkSchema.options.map((value) => ({
      value,
      count: byNetwork.filter((nft) => nft.network === value).length,
    })),
    priceRange: {
      minEth: prices[0] ?? "0",
      maxEth: prices.at(-1) ?? "0",
    },
  }
}

export function listNfts(db: MockDb, query: NftListQuery) {
  const matches = sortNfts(filterNfts(db, query), query.sort)
  const start = (query.page - 1) * PAGE_SIZE

  return {
    items: matches.slice(start, start + PAGE_SIZE),
    page: query.page,
    pageSize: PAGE_SIZE,
    totalItems: matches.length,
    totalPages: Math.ceil(matches.length / PAGE_SIZE),
    facets: createFacets(db, query),
  }
}
