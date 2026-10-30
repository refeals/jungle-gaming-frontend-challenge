import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import { Button } from "@/components/ui/button"

export function AccountFormSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col gap-6">
      <SkeletonShimmer className="h-4 w-52" />
      <div className="grid gap-6 md:grid-cols-2 md:gap-x-7">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2.5">
            <SkeletonShimmer className="h-[15px] w-36" />
            <SkeletonShimmer className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AccountError({
  title,
  onRetry,
}: {
  title: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-24 text-center"
    >
      <h2 className="text-[18px] font-bold">{title}</h2>
      <p className="text-[14px]/6 text-muted-foreground">
        Verifique a conexão e tente de novo.
      </p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  )
}
