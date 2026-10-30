import { useQuery } from "@tanstack/react-query"

import { StarIcon } from "@/components/icons"
import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import { Button } from "@/components/ui/button"
import { nftReviewsOptions } from "@/features/catalog/queries"

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" })

export function NftReviews({ nftId }: { nftId: string }) {
  const { data, isFetching, refetch } = useQuery(nftReviewsOptions(nftId))

  if (!data && isFetching) {
    return (
      <div
        role="status"
        aria-label="Carregando avaliações"
        className="space-y-4"
      >
        {[1, 2, 3].map((item) => (
          <SkeletonShimmer key={item} className="h-[72px] w-full" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-[14px]/6">
          Não foi possível carregar as avaliações.
        </p>
        <Button size="sm" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {data.map((review) => (
        <li key={review.id} className="border-b border-border pb-4">
          <p className="flex flex-wrap items-center gap-2 text-[14px]/6 font-bold">
            {review.author}
            <span className="flex items-center gap-1 font-medium text-rating">
              <StarIcon className="size-3.5" />
              <span className="sr-only">Nota </span>
              {review.rating}
            </span>
            <span className="text-[12px]/4 font-normal text-subtle-foreground">
              {dateFormat.format(new Date(review.createdAt))}
            </span>
          </p>
          <p className="mt-1 text-[14px]/6 text-muted-foreground">
            {review.comment}
          </p>
        </li>
      ))}
    </ul>
  )
}
