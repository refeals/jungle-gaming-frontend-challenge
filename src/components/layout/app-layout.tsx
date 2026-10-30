import { Outlet } from "@tanstack/react-router"

import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1248px] flex-col px-6 pt-10 pb-[150px] md:pt-6 md:pb-6">
      <SiteHeader />
      <main className="flex-1 md:mt-8">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileNav />
    </div>
  )
}
