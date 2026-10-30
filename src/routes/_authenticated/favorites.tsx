import { useQueries, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useRef, type RefObject } from "react"

import { ApiError } from "@/api/errors"
import { Button, buttonVariants } from "@/components/ui/button"
import { useAuthenticatedUser } from "@/features/auth/authenticated-user"
import { useSession } from "@/features/auth/session"
import { NftCard } from "@/features/catalog/nft-card"
import {
  CARD_OFFSET,
  GRID_CLASS,
  NftGridSkeleton,
} from "@/features/catalog/nft-grid-skeleton"
import { nftDetailOptions } from "@/features/catalog/queries"
import { favoritesOptions } from "@/features/favorites/queries"
import { cn } from "@/lib/utils"

const FAVORITES_GRID = "xl:grid-cols-4"

function isMissingNft(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

function FavoritesContent({
  headingRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const user = useAuthenticatedUser()
  const { data: session } = useSession()
  const favorites = useQuery({
    ...favoritesOptions(user.id),
    enabled: Boolean(session),
  })
  const nftQueries = useQueries({
    queries: (favorites.data ?? []).map(nftDetailOptions),
  })
  const failedNftQueries = nftQueries.filter(
    ({ data, error }) => !data && error && !isMissingNft(error)
  )
  const nfts = nftQueries.flatMap(({ data }) => (data ? [data] : []))
  const favoriteCount = favorites.data?.length
  const previousCount = useRef(favoriteCount)

  useEffect(() => {
    const previous = previousCount.current
    previousCount.current = favoriteCount
    if (
      previous !== undefined &&
      favoriteCount !== undefined &&
      favoriteCount < previous &&
      document.activeElement === document.body
    ) {
      headingRef.current?.focus()
    }
  }, [favoriteCount, headingRef])

  if ((!favorites.data && favorites.isError) || failedNftQueries.length > 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 py-24 text-center"
      >
        <h2 className="text-[18px] font-bold">
          Não foi possível carregar seus favoritos
        </h2>
        <p className="text-[14px]/6 text-muted-foreground">
          Verifique a conexão e tente de novo.
        </p>
        <Button
          onClick={() => {
            void favorites.refetch()
            failedNftQueries.forEach((query) => void query.refetch())
          }}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (
    !favorites.data ||
    (nfts.length === 0 && nftQueries.some(({ isPending }) => isPending))
  ) {
    return <NftGridSkeleton className={FAVORITES_GRID} />
  }

  if (nfts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h2 className="text-[18px] font-bold">Nenhum favorito por aqui</h2>
        <p className="text-[14px]/6 text-muted-foreground">
          Explore o catálogo e favorite os NFTs que quiser acompanhar.
        </p>
        <Link to="/" hash="catalog" className={buttonVariants()}>
          Explorar o catálogo
        </Link>
      </div>
    )
  }

  return (
    <>
      <p role="status" className="sr-only">
        {nfts.length === 1 ? "1 favorito" : `${nfts.length} favoritos`}
      </p>
      <div className={cn(GRID_CLASS, FAVORITES_GRID)}>
        {nfts.map((nft) => (
          <div key={nft.id} className={CARD_OFFSET}>
            <NftCard nft={nft} />
          </div>
        ))}
      </div>
    </>
  )
}

function FavoritesPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  return (
    <section className="flex flex-col gap-6 md:gap-8">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-[28px]/9 font-bold outline-none"
      >
        Favoritos
      </h1>
      <FavoritesContent headingRef={headingRef} />
    </section>
  )
}

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
})
