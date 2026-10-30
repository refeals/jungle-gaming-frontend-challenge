import { Link, useRouterState } from "@tanstack/react-router"

import { KurioLogo } from "@/components/brand/kurio-logo"
import { ComingSoonButton } from "@/components/coming-soon-button"
import { CartIcon, SearchIcon, SignInIcon } from "@/components/icons"
import { buttonVariants } from "@/components/ui/button"
import { useCurrentLocationTarget } from "@/features/auth/use-current-location-target"
import { cn } from "@/lib/utils"

const MARKET_ROUTES = /^\/(nft|cart|checkout)(\/|$)/
const NAV_ITEM = "flex h-[45px] items-start text-[16px]/[21px]"
const NAV_ACTIVE = "border-b-3 border-primary font-bold text-brand-text"

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isMarketRoute = MARKET_ROUTES.test(pathname)
  const currentLocation = useCurrentLocationTarget()

  return (
    <header className="hidden border-b-[0.5px] border-primary/60 md:block">
      <div className="flex h-[45px] items-start justify-between">
        <KurioLogo className="mt-2 w-auto lg:w-40" />

        <nav aria-label="Navegação principal">
          <ul className="flex gap-6 lg:gap-10">
            <li>
              <Link
                to="/"
                activeOptions={{
                  exact: true,
                  includeHash: true,
                  includeSearch: false,
                }}
                className={NAV_ITEM}
                activeProps={{ className: NAV_ACTIVE }}
              >
                Início
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="catalog"
                activeOptions={{
                  exact: true,
                  includeHash: true,
                  includeSearch: false,
                }}
                aria-current={isMarketRoute ? "page" : undefined}
                className={cn(NAV_ITEM, isMarketRoute && NAV_ACTIVE)}
                activeProps={{ className: NAV_ACTIVE }}
              >
                Mercado
              </Link>
            </li>
            <li>
              <ComingSoonButton className={NAV_ITEM}>Criadores</ComingSoonButton>
            </li>
            <li>
              <ComingSoonButton className={NAV_ITEM}>Aprenda</ComingSoonButton>
            </li>
          </ul>
        </nav>

        <div className="flex h-[35px] items-center gap-7">
          <ComingSoonButton aria-label="Buscar">
            <SearchIcon className="size-5" />
          </ComingSoonButton>
          <Link to="/cart" aria-label="Carrinho, 0 itens" className="relative">
            <CartIcon className="h-6 w-[25px]" />
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground outline-2 outline-background"
            >
              0
            </span>
          </Link>
          <Link
            {...currentLocation}
            search={(prev) => ({ ...prev, auth: "login" })}
            className={cn(buttonVariants({ size: "sm" }), "w-[100px] font-medium")}
          >
            <SignInIcon className="size-5" />
            Entrar
          </Link>
        </div>
      </div>
    </header>
  )
}
