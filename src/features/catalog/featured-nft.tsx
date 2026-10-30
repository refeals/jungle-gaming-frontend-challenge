import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useId } from "react"

import { NftImage } from "@/components/nft-image"
import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import { featuredNftOptions } from "@/features/catalog/queries"
import { cn } from "@/lib/utils"

export function FeaturedNft({ className }: { className?: string }) {
  const titleId = useId()
  const { data: nft, isError } = useQuery(featuredNftOptions())

  if (isError && !nft) return null

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "bg-[linear-gradient(180deg,rgb(210_138_76_/_0.1),rgb(210_138_76_/_0.03))] pt-6",
        className
      )}
    >
      <h2 id={titleId} className="px-5 text-[24px]/8 font-bold text-brand-text">
        NFT EM DESTAQUE
      </h2>
      <p className="mt-4 text-center text-[22px]/4 font-bold">
        OFERTA LIMITADA
      </p>
      <div className="mt-4 aspect-[310/368]">
        {nft ? (
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver ${nft.name}`}
            className="block size-full"
          >
            <NftImage
              image={nft.images[0]}
              sizes="(min-width: 1280px) 310px, (min-width: 1024px) 260px, 100vw"
              width={310}
              height={368}
              className="size-full rounded-[22px] object-cover"
            />
          </Link>
        ) : (
          <SkeletonShimmer className="size-full rounded-[22px]" />
        )}
      </div>
    </section>
  )
}
