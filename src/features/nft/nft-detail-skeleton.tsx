import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import {
  GALLERY_LAYOUT,
  GALLERY_MAIN,
  GALLERY_THUMB,
  GALLERY_THUMBS,
} from "@/features/nft/nft-gallery"
import {
  BUY_BAR,
  DETAIL_COLUMNS,
  DETAIL_SHEET,
  MOBILE_HERO,
} from "@/features/nft/nft-detail"

export function NftDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando NFT"
      data-testid="nft-detail-skeleton"
    >
      <div className="hidden h-4 md:block" />
      <div className={DETAIL_COLUMNS}>
        <div className={MOBILE_HERO}>
          <div className="h-[43px] md:hidden" />
          <div className={GALLERY_LAYOUT} data-testid="nft-gallery">
            <div className={GALLERY_THUMBS}>
              {[1, 2, 3, 4].map((item) => (
                <SkeletonShimmer key={item} className={GALLERY_THUMB} />
              ))}
            </div>
            <SkeletonShimmer className={GALLERY_MAIN} />
          </div>
        </div>

        <div className={DETAIL_SHEET}>
          <SkeletonShimmer className="h-[37px] w-2/3" />
          <SkeletonShimmer className="mt-3 h-5 w-1/3" />
          <SkeletonShimmer className="mt-6 h-20 w-full" />
          <SkeletonShimmer className="mt-5 h-14 w-1/2" />
          <SkeletonShimmer className="mt-5 h-[50px] w-full" />
          <SkeletonShimmer className="mt-5 h-[84px] w-1/2" />
        </div>
      </div>

      <SkeletonShimmer className="mt-8 h-[340px] w-full md:mt-24" />
      <SkeletonShimmer className="mt-16 h-[407px] w-full xl:mt-24" />

      <div className={BUY_BAR}>
        <SkeletonShimmer className="h-[30px] w-full" />
        <SkeletonShimmer className="mt-7 h-[60px] w-[196px] rounded-[40px]" />
      </div>
    </div>
  )
}
