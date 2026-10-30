import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

export function KurioLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "text-[14px]/[18.5px] font-bold tracking-[1.4px] text-foreground",
        className
      )}
    >
      KURIO
    </Link>
  )
}
