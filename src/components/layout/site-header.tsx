import { Link, useRouterState } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { KurioLogo } from "@/components/brand/kurio-logo"
import { ComingSoonButton } from "@/components/coming-soon-button"
import { CartIcon, SignInIcon } from "@/components/icons"
import { LazyBoundary } from "@/components/lazy-boundary"
import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import { buttonVariants } from "@/components/ui/button"
import { useSession } from "@/features/auth/session"
import { cartLinkLabel, useCartCount } from "@/features/cart/queries"
import { useCurrentLocationTarget } from "@/features/auth/use-current-location-target"
import { HeaderSearch } from "@/features/catalog/header-search"
import { cn } from "@/lib/utils"

const UserMenu = lazy(() =>
  import("@/components/layout/user-menu").then((module) => ({
    default: module.UserMenu,
  }))
)

const MARKET_ROUTES = /^\/(nft|cart|checkout)(\/|$)/
const NAV_ITEM = "flex h-[45px] items-start text-[16px]/[21px]"
const NAV_ACTIVE = "border-b-3 border-primary font-bold text-brand-text"

const MAX_BADGE_COUNT = 99

function CartLink() {
  const count = useCartCount()

  return (
    <Link to="/cart" aria-label={cartLinkLabel(count)} className="relative">
      <CartIcon className="h-6 w-[25px]" />
      {count !== undefined && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-medium text-primary-foreground outline-2 outline-background"
        >
          {count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count}
        </span>
      )}
    </Link>
  )
}

function SignInLink() {
  const currentLocation = useCurrentLocationTarget()

  return (
    <Link
      {...currentLocation}
      state={{ authOpenedInPage: true }}
      search={(prev) => ({ ...prev, auth: "login" })}
      className={cn(buttonVariants({ size: "sm" }), "w-[100px] font-medium")}
    >
      <SignInIcon className="size-5" />
      Entrar
    </Link>
  )
}

function HeaderAccount() {
  const { data: session, isPending, refetch } = useSession()
  const accountSkeleton = (
    <SkeletonShimmer
      role="status"
      aria-label="Carregando conta"
      className="h-[35px] w-[100px]"
    />
  )

  if (isPending) return accountSkeleton
  if (session === null) return <SignInLink />
  if (!session) {
    return (
      <button
        type="button"
        aria-label="Não foi possível carregar sua conta. Recarregar"
        onClick={() => void refetch()}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "w-[100px] px-0 text-[14px] font-medium"
        )}
      >
        Recarregar
      </button>
    )
  }

  return (
    <LazyBoundary fallback={<SignInLink />}>
      <Suspense fallback={accountSkeleton}>
        <UserMenu user={session.user} />
      </Suspense>
    </LazyBoundary>
  )
}

export function SiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isMarketRoute = MARKET_ROUTES.test(pathname)

  return (
    <header
      className={cn(
        "hidden md:block",
        !pathname.startsWith("/nft/") && "border-b-[0.5px] border-primary/60"
      )}
    >
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
              <ComingSoonButton className={NAV_ITEM}>
                Criadores
              </ComingSoonButton>
            </li>
            <li>
              <ComingSoonButton className={NAV_ITEM}>Aprenda</ComingSoonButton>
            </li>
          </ul>
        </nav>

        <div className="flex h-[35px] items-center gap-7">
          <HeaderSearch />
          <CartLink />
          <HeaderAccount />
        </div>
      </div>
    </header>
  )
}
