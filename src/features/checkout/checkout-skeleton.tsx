import { SkeletonShimmer } from "@/components/skeleton-shimmer"

export function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((item) => (
        <SkeletonShimmer key={item} className="h-[70px] w-full" />
      ))}
      <SkeletonShimmer className="h-40 w-full" />
    </div>
  )
}

export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pagamento"
      className="grid gap-8 md:mt-[53px] lg:grid-cols-[minmax(0,763fr)_minmax(0,405fr)]"
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-x-6">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2.5">
            <SkeletonShimmer className="h-[15px] w-36" />
            <SkeletonShimmer className="h-10 w-full" />
          </div>
        ))}
      </div>
      <SummarySkeleton />
    </div>
  )
}
