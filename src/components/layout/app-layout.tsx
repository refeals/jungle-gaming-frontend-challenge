import { Outlet, useRouterState } from "@tanstack/react-router"

import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { cn } from "@/lib/utils"

export function AppLayout() {
  const pathname = useRouterState({
    select: ({ location }) => location.pathname,
  })
  const isNftRoute = pathname.startsWith("/nft/")
  const isCartRoute = pathname === "/cart"

  return (
    <div
      className={cn(
        "mx-auto flex min-h-svh w-full max-w-[1248px] flex-col px-6 md:pt-6 md:pb-6",
        isNftRoute && "pb-[190px]",
        isCartRoute && "pt-8 pb-6",
        !isNftRoute && !isCartRoute && "pt-10 pb-[150px]"
      )}
    >
      <SiteHeader />
      <main className="flex-1 md:mt-8">
        <Outlet />
      </main>
      <SiteFooter />
      {!isNftRoute && !isCartRoute && <MobileNav />}
    </div>
  )
}
