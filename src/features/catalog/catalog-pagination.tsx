import { Link } from "@tanstack/react-router"

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

const VISIBLE_PAGES = 4
const PAGE_ITEM =
  "flex size-[35px] items-center justify-center rounded-[4px] border border-border text-[18px]/4"

function getVisiblePages(page: number, totalPages: number) {
  const count = Math.min(VISIBLE_PAGES, totalPages)
  const first = Math.min(
    Math.max(page - Math.floor((count - 1) / 2), 1),
    totalPages - count + 1
  )
  return Array.from({ length: count }, (_, index) => first + index)
}

function scrollToCatalog() {
  document.getElementById("catalog")?.scrollIntoView()
}

function PageLink({
  page,
  className,
  label,
  isCurrent,
  children,
}: {
  page: number
  className?: string
  label: string
  isCurrent?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to="/"
      search={(prev) => ({ ...prev, page: page === 1 ? undefined : page })}
      resetScroll={false}
      aria-label={label}
      aria-current={isCurrent ? "page" : undefined}
      onClick={scrollToCatalog}
      className={cn(PAGE_ITEM, className)}
    >
      {children}
    </Link>
  )
}

export function CatalogPagination({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação" className="mt-12 md:mt-[88px]">
      <ul className="flex justify-end gap-2">
        {page > 1 && (
          <li>
            <PageLink page={page - 1} label="Página anterior">
              <ChevronLeftIcon className="size-[18px]" />
            </PageLink>
          </li>
        )}
        {getVisiblePages(page, totalPages).map((item) => (
          <li key={item}>
            <PageLink
              page={item}
              label={`Página ${item}`}
              isCurrent={item === page}
              className={cn(
                item === page &&
                  "border-primary bg-primary font-bold text-primary-foreground"
              )}
            >
              {item}
            </PageLink>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <PageLink page={page + 1} label="Próxima página">
              <ChevronRightIcon className="size-[18px]" />
            </PageLink>
          </li>
        )}
      </ul>
    </nav>
  )
}
