import { SkeletonShimmer } from "@/components/skeleton-shimmer"

export function OrderSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pedido"
      className="mx-auto flex w-full max-w-[578px] flex-col gap-4"
    >
      <SkeletonShimmer className="h-[156px] w-full" />
      <SkeletonShimmer className="h-[65px] w-full" />
      {[1, 2, 3].map((item) => (
        <SkeletonShimmer key={item} className="h-[70px] w-full" />
      ))}
    </div>
  )
}
