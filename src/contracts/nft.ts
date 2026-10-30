import * as z from "zod/mini"

import {
  ethAddress,
  ethAmount,
  isoDateTime,
  network,
  nftCategory,
  paginated,
} from "@/contracts/common"

export const nftRarity = z.enum(["rare"])

export const nftImage = z.object({
  basePath: z.string(),
  alt: z.string(),
})

export const edition = z.object({
  id: z.string(),
  label: z.string(),
  supply: z.nullable(z.number()),
  available: z.nullable(z.number()),
})

export const nft = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  slug: z.string(),
  collection: z.string(),
  category: nftCategory,
  network,
  priceEth: ethAmount,
  previousPriceEth: z.optional(ethAmount),
  rarity: z.optional(nftRarity),
  rating: z.number(),
  reviewCount: z.number(),
  description: z.string(),
  contractAddress: ethAddress,
  royaltyPercent: z.number(),
  attributes: z.array(z.string()),
  images: z.array(nftImage),
  editions: z.array(edition),
  listedAt: isoDateTime,
  trendingScore: z.number(),
  version: z.number(),
})

export const nftTab = z.enum(["all", "new", "trending"])

export const nftSort = z.enum(["recent", "price-asc", "price-desc", "name"])

export const nftListQuery = z.object({
  tab: z._default(nftTab, "all"),
  collection: z.optional(nftCategory),
  network: z.optional(network),
  minPrice: z.optional(ethAmount),
  maxPrice: z.optional(ethAmount),
  sort: z._default(nftSort, "recent"),
  q: z.optional(z.string()),
  page: z._default(z.coerce.number().check(z.int(), z.gte(1)), 1),
})

const facetCount = <Value extends z.ZodMiniType>(value: Value) =>
  z.object({ value, count: z.number() })

export const nftFacets = z.object({
  categories: z.array(facetCount(nftCategory)),
  networks: z.array(facetCount(network)),
  priceRange: z.object({ minEth: ethAmount, maxEth: ethAmount }),
})

export const nftListResponse = z.extend(paginated(nft), {
  facets: nftFacets,
})
