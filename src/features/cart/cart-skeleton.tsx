import { SkeletonShimmer } from "@/components/skeleton-shimmer"

export function CartLinesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando carrinho"
      className="flex flex-col gap-5 md:gap-3"
    >
      {[1, 2, 3].map((item) => (
        <SkeletonShimmer
          key={item}
          className="h-[100px] rounded-[14px] md:h-[70px] md:rounded-none"
        />
      ))}
    </div>
  )
}
