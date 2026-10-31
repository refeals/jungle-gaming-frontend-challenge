import { useQuery } from "@tanstack/react-query"

import type { CartItem } from "@/contracts"
import { nftListOptions } from "@/features/catalog/queries"
import { NftCarousel } from "@/features/nft/nft-carousel"

export function RecommendedNfts({ cartItems }: { cartItems: CartItem[] }) {
  const { data, isPending } = useQuery(
    nftListOptions({ tab: "trending", sort: "recent", page: 1 })
  )
  const cartNftIds = new Set(cartItems.map((item) => item.nftId))

  return (
    <NftCarousel
      title="Colecionadores também viram"
      items={data?.items.filter((nft) => !cartNftIds.has(nft.id)) ?? []}
      isPending={isPending}
    />
  )
}
