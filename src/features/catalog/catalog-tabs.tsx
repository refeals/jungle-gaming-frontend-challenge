import { Link } from "@tanstack/react-router"

import type { NftListQuery } from "@/contracts"
import { tabLabels } from "@/features/catalog/labels"
import { cn } from "@/lib/utils"

const TABS: NftListQuery["tab"][] = ["all", "new", "trending"]

export function CatalogTabs({ active }: { active: NftListQuery["tab"] }) {
  return (
    <nav
      aria-label="Abas do catálogo"
      className="min-w-0 [scrollbar-width:none] overflow-x-auto"
    >
      <ul className="flex gap-1.5 whitespace-nowrap min-[414px]:gap-2.5 md:gap-5">
        {TABS.map((tab) => (
          <li key={tab}>
            <Link
              to="/"
              search={(prev) => ({
                ...prev,
                tab: tab === "all" ? undefined : tab,
                page: undefined,
              })}
              resetScroll={false}
              aria-current={tab === active ? "page" : undefined}
              className={cn(
                "block border-b-2 border-transparent pb-1 text-[14px]/4 md:text-[15px]/4 md:font-medium",
                tab === active && "border-primary font-bold text-brand-text"
              )}
            >
              {tabLabels[tab]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
