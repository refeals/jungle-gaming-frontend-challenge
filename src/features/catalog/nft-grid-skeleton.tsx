import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import {
  CARD_FRAME,
  CARD_IMAGE,
  CARD_NAME,
  CARD_PRICE,
} from "@/features/catalog/nft-card"

const GRID_CLASS =
  "grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:grid-cols-3 md:gap-x-4 md:gap-y-[72px] md:pb-0 xl:gap-x-[34px]"

const CARD_OFFSET = "max-md:even:translate-y-8"

export { CARD_OFFSET, GRID_CLASS }

export function NftGridSkeleton() {
  return (
    <div
      data-testid="catalog-skeleton"
      role="status"
      aria-label="Carregando NFTs"
      className={GRID_CLASS}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className={CARD_OFFSET}>
          <div className={CARD_FRAME}>
            <SkeletonShimmer className={CARD_IMAGE} />
          </div>
          <div className={`${CARD_NAME} flex h-5 items-center md:h-4`}>
            <SkeletonShimmer className="h-3 w-3/4" />
          </div>
          <div className={`${CARD_PRICE} flex h-4 items-center`}>
            <SkeletonShimmer className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
