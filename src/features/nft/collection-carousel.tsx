import { useQuery } from "@tanstack/react-query"

import type { Nft } from "@/contracts"
import { nftListOptions } from "@/features/catalog/queries"
import { NftCarousel } from "@/features/nft/nft-carousel"

export function CollectionCarousel({ nft }: { nft: Nft }) {
  const { data, isPending } = useQuery(
    nftListOptions({
      tab: "all",
      sort: "recent",
      page: 1,
      collection: nft.category,
    })
  )

  return (
    <NftCarousel
      title="Mais desta coleção"
      items={data?.items.filter((item) => item.id !== nft.id) ?? []}
      isPending={isPending}
    />
  )
}
