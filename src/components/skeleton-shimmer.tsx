import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonShimmer({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn("shimmer", className)} {...props} />
}
