import { useQueryClient, type UseQueryResult } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-keys"
import { Button } from "@/components/ui/button"
import type { NftListResponse } from "@/contracts"
import { NftCard } from "@/features/catalog/nft-card"
import {
  CARD_OFFSET,
  GRID_CLASS,
  NftGridSkeleton,
} from "@/features/catalog/nft-grid-skeleton"
import { cn } from "@/lib/utils"

type NftGridProps = {
  query: UseQueryResult<NftListResponse>
  onClearFilters: () => void
}

export function NftGrid({ query, onClearFilters }: NftGridProps) {
  const queryClient = useQueryClient()
  const { data, isFetching, isPlaceholderData } = query

  if (!data && isFetching) return <NftGridSkeleton />

  if (!data) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 py-24 text-center"
      >
        <h3 className="text-[18px] font-bold">
          Não foi possível carregar os NFTs
        </h3>
        <p className="text-[14px]/6 text-muted-foreground">
          Verifique a conexão e tente de novo.
        </p>
        <Button
          onClick={() =>
            void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
          }
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (data.totalItems === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h3 className="text-[18px] font-bold">Nenhum NFT encontrado</h3>
        <p className="text-[14px]/6 text-muted-foreground">
          Ajuste a busca ou os filtros para ver outros resultados.
        </p>
        <Button onClick={onClearFilters}>Limpar filtros</Button>
      </div>
    )
  }

  return (
    <div className="relative">
      {isPlaceholderData && (
        <p className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-[13px]/5 whitespace-nowrap text-foreground">
          Atualizando resultados...
        </p>
      )}
      <div
        data-testid="catalog-grid"
        aria-busy={isPlaceholderData}
        className={cn(
          GRID_CLASS,
          "transition-opacity",
          isPlaceholderData && "opacity-60"
        )}
      >
        {data.items.map((nft) => (
          <div key={nft.id} className={CARD_OFFSET}>
            <NftCard nft={nft} />
          </div>
        ))}
      </div>
    </div>
  )
}
