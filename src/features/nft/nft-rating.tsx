import { StarIcon } from "@/components/icons"
import type { Nft } from "@/contracts"

const STARS = [1, 2, 3, 4, 5]

export function NftRating({ nft }: { nft: Nft }) {
  const filled = Math.round(nft.rating)

  return (
    <>
      <div className="hidden items-center gap-1.5 md:flex">
        <span className="flex" aria-hidden="true">
          {STARS.map((star) => (
            <StarIcon
              key={star}
              className={
                star <= filled
                  ? "size-[15px] text-primary"
                  : "size-[15px] text-border"
              }
            />
          ))}
        </span>
        <span className="sr-only">Nota {nft.rating} de 5.</span>
        <span className="text-[15px]/5">
          {nft.reviewCount} avaliações de colecionadores
        </span>
      </div>
      <div className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-primary px-1.5 md:hidden">
        <StarIcon className="size-3.5 text-rating" />
        <span className="sr-only">Nota </span>
        <span className="text-[14px]/4 font-medium">{nft.rating}</span>
        <span className="text-[14px]/4 text-muted-foreground">
          <span aria-hidden="true">({nft.reviewCount})</span>
          <span className="sr-only">, {nft.reviewCount} avaliações</span>
        </span>
      </div>
    </>
  )
}
