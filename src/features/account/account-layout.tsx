import { Link } from "@tanstack/react-router"
import type { ComponentType, ReactNode, SVGProps } from "react"

import { ComingSoonButton } from "@/components/coming-soon-button"
import {
  ActivityIcon,
  CartIcon,
  DangerIcon,
  DownloadIcon,
  HeartOutlineIcon,
  LocationIcon,
  LogoutIcon,
  UserOutlineIcon,
} from "@/components/icons"
import { useLogout } from "@/features/auth/session"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const NAV_ITEM =
  "flex h-11 w-full items-center gap-3 border-b-2 border-transparent px-3 text-left text-[15px] whitespace-nowrap text-brand-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[status=active]:border-primary data-[status=active]:font-medium md:h-[45px] md:border-b-0 md:border-l-[6px] md:px-2.5"
const NAV_ICON = "size-[18px] shrink-0 text-muted-foreground"

const links: {
  label: string
  to: "/profile" | "/wallets" | "/favorites"
  icon: IconComponent
}[] = [
  { label: "Dados do perfil", to: "/profile", icon: UserOutlineIcon },
  { label: "Carteiras", to: "/wallets", icon: LocationIcon },
]

function NavLink({
  label,
  to,
  icon: Icon,
}: {
  label: string
  to: "/profile" | "/wallets" | "/favorites"
  icon: IconComponent
}) {
  return (
    <li className="shrink-0 md:shrink">
      <Link to={to} className={NAV_ITEM}>
        <Icon className={NAV_ICON} />
        {label}
      </Link>
    </li>
  )
}

function ComingSoonItem({
  label,
  icon: Icon,
}: {
  label: string
  icon: IconComponent
}) {
  return (
    <li className="shrink-0 md:shrink">
      <ComingSoonButton className={NAV_ITEM}>
        <Icon className={NAV_ICON} />
        {label}
      </ComingSoonButton>
    </li>
  )
}

export function AccountLayout({ children }: { children: ReactNode }) {
  const logout = useLogout()

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-7">
      <aside className="-mx-6 bg-card md:mx-0 md:w-[250px] md:shrink-0 lg:w-[310px]">
        <h2 className="sr-only text-[18px]/9 font-bold md:not-sr-only md:px-4 md:pt-2">
          Meu perfil
        </h2>
        <nav aria-label="Conta">
          <ul className="flex overflow-x-auto md:flex-col md:overflow-visible">
            {links.map((link) => (
              <NavLink key={link.to} {...link} />
            ))}
            <ComingSoonItem label="Atividade" icon={CartIcon} />
            <NavLink
              label="Lista de interesse"
              to="/favorites"
              icon={HeartOutlineIcon}
            />
            <ComingSoonItem label="Ofertas" icon={ActivityIcon} />
            <ComingSoonItem label="Arquivos baixados" icon={DownloadIcon} />
            <ComingSoonItem label="Suporte" icon={DangerIcon} />
            <li className="shrink-0 md:mt-0 md:border-t md:border-primary/60">
              <button
                type="button"
                aria-disabled={logout.isPending || undefined}
                onClick={() => {
                  if (!logout.isPending) logout.mutate()
                }}
                className={`${NAV_ITEM} font-bold md:h-10`}
              >
                <LogoutIcon className="size-5 shrink-0" />
                Sair
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
