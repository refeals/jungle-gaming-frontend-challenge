import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ApiError } from "@/api/errors"
import { Button } from "@/components/ui/button"
import { nftDetailOptions } from "@/features/catalog/queries"
import { NftDetail } from "@/features/nft/nft-detail"
import { NftDetailSkeleton } from "@/features/nft/nft-detail-skeleton"
import { NftNotFound } from "@/features/nft/nft-not-found"

type NftSearch = {
  edition?: string
}

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, error, isFetching, refetch } = useQuery(nftDetailOptions(nftId))

  if (error instanceof ApiError && error.code === "not_found") {
    return <NftNotFound />
  }

  if (!data && isFetching) return <NftDetailSkeleton />

  if (!data) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 px-6 py-24 text-center"
      >
        <h1 className="text-[28px] font-bold">
          Não foi possível carregar este NFT
        </h1>
        <p className="text-[14px]/[24px] text-muted-foreground">
          Verifique a conexão e tente de novo.
        </p>
        <Button onClick={() => void refetch()}>Tentar novamente</Button>
        <Link to="/" hash="catalog" className="text-[14px]/6 underline">
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <NftDetail
      key={data.id}
      nft={data}
      editionId={edition}
      onEditionChange={(next) =>
        void navigate({
          search: (prev) => ({ ...prev, edition: next }),
          replace: true,
          resetScroll: false,
        })
      }
    />
  )
}

export const Route = createFileRoute("/nft/$nftId")({
  validateSearch: (search: Record<string, unknown>): NftSearch => ({
    edition: typeof search.edition === "string" ? search.edition : undefined,
  }),
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailOptions(params.nftId))
  },
  component: NftDetailPage,
})
