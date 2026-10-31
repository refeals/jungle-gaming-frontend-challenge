import { Link, type LinkProps } from "@tanstack/react-router"
import type { ComponentType, SVGProps } from "react"

import { ComingSoonButton } from "@/components/coming-soon-button"
import {
  HeartIcon,
  HomeIcon,
  ScanIcon,
  ShopIcon,
  UserIcon,
} from "@/components/icons"
import { cartLinkLabel, useCartCount } from "@/features/cart/queries"

const navItems: {
  label: string
  to: LinkProps["to"]
  icon: ComponentType<SVGProps<SVGSVGElement>>
  position: string
}[] = [
  { label: "Início", to: "/", icon: HomeIcon, position: "left-[11.1%]" },
  {
    label: "Favoritos",
    to: "/favorites",
    icon: HeartIcon,
    position: "left-[28.5%]",
  },
  { label: "Carrinho", to: "/cart", icon: ShopIcon, position: "left-[72.9%]" },
  { label: "Perfil", to: "/profile", icon: UserIcon, position: "left-[87.9%]" },
]

export function MobileNav() {
  const cartCount = useCartCount()

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[126px] md:hidden short:relative short:-mx-6 short:shrink-0"
    >
      <svg
        viewBox="30 40 414 95"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-x-0 bottom-0 h-[95px] w-full drop-shadow-[0_-10px_15px_rgb(10_6_4_/_0.45)]"
      >
        <path
          fill="var(--card)"
          className="pointer-events-auto"
          d="M312.85 40C299.09 40 286.87 48.2 281.02 60.65C273.26 77.17 256.46 88.62 237 88.62C217.54 88.62 200.74 77.18 192.98 60.65C187.13 48.2 174.9 40 161.15 40H58.93C42.95 40 30 52.95 30 68.93V134.95H444V68.93C444 52.95 431.05 40 415.07 40H312.85Z"
        />
      </svg>

      <ComingSoonButton
        aria-label="Escanear"
        className="pointer-events-auto absolute top-0 left-1/2 flex size-[65px] -translate-x-1/2 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgb(210_138_76_/_0.4)_-17%,#d28a4c_109%)] text-foreground"
      >
        <ScanIcon className="h-6 w-[27px]" />
      </ComingSoonButton>

      {navItems.map(({ label, to, icon: Icon, position }) => (
        <Link
          key={label}
          to={to}
          aria-label={to === "/cart" ? cartLinkLabel(cartCount) : label}
          activeOptions={{ exact: true, includeSearch: false }}
          className={`pointer-events-auto absolute top-[59px] flex size-11 -translate-x-1/2 items-center justify-center text-muted-foreground data-[status=active]:text-brand-text ${position}`}
        >
          <Icon className="size-5" />
        </Link>
      ))}
    </nav>
  )
}
