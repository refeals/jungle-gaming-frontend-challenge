import { useEffect, useId, useRef, useState } from "react"

import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import type { Nft } from "@/contracts"
import { NftCard } from "@/features/catalog/nft-card"
import { cn } from "@/lib/utils"

const ITEM =
  "w-[46%] shrink-0 snap-start md:w-[30%] xl:w-[calc((100%-104px)/5)]"

type NftCarouselProps = {
  title: string
  items: Nft[]
  isPending: boolean
}

export function NftCarousel({ title, items, isPending }: NftCarouselProps) {
  const titleId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [activePage, setActivePage] = useState(0)
  const hasItems = items.length > 0

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      if (list.clientWidth === 0) return

      const pages = Math.ceil((list.scrollWidth - 1) / list.clientWidth)
      const isAtEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1
      setPageCount(pages)
      setActivePage(
        isAtEnd ? pages - 1 : Math.round(list.scrollLeft / list.clientWidth)
      )
    }
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    list.addEventListener("scroll", measure, { passive: true })

    return () => {
      observer.disconnect()
      list.removeEventListener("scroll", measure)
    }
  }, [hasItems, items.length])

  function goToPage(page: number) {
    const list = listRef.current
    if (list) list.scrollTo({ left: page * list.clientWidth })
  }

  if (!isPending && !hasItems) return null

  return (
    <section aria-labelledby={titleId} className="mt-16 xl:mt-24">
      <h2
        id={titleId}
        className="border-b border-primary/40 pb-3 text-[17px]/4 font-bold text-brand-text"
      >
        {title}
      </h2>

      {isPending ? (
        <div
          role="status"
          aria-label={`Carregando ${title}`}
          className="mt-8 flex gap-[26px] overflow-hidden"
        >
          {[1, 2, 3, 4, 5].map((item) => (
            <SkeletonShimmer
              key={item}
              className={cn(ITEM, "aspect-[219/303]")}
            />
          ))}
        </div>
      ) : (
        <ul
          ref={listRef}
          className="mt-8 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto md:gap-[26px]"
        >
          {items.map((item: Nft) => (
            <li key={item.id} className={ITEM}>
              <NftCard nft={item} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="mt-6 flex justify-center">
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={`Página ${page + 1} de ${pageCount}: ${title}`}
              aria-current={page === activePage ? "true" : undefined}
              onClick={() => goToPage(page)}
              className="flex size-6 items-center justify-center"
            >
              <span
                className={cn(
                  "size-3 rounded-full border border-primary",
                  page === activePage && "bg-primary"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
