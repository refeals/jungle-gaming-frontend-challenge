import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { FilterIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { CatalogSort } from "@/features/catalog/catalog-sort"
import { FiltersPanel } from "@/features/catalog/filters-panel"
import { nftListOptions } from "@/features/catalog/queries"
import { toListQuery, type CatalogSearch } from "@/features/catalog/search"
import {
  useCatalogFilters,
  type CatalogFilters,
} from "@/features/catalog/use-catalog-filters"
import { cn } from "@/lib/utils"

function selectFilters(search: CatalogSearch): CatalogFilters {
  return {
    tab: search.tab,
    collection: search.collection,
    network: search.network,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort,
  }
}

export function FiltersDrawer({
  triggerClassName,
}: {
  triggerClassName?: string
}) {
  const { search, setFilter } = useCatalogFilters()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<CatalogFilters>({})
  const { data, isPending } = useQuery(
    nftListOptions(
      toListQuery(isOpen ? { ...search, ...draft, page: undefined } : search)
    )
  )

  function handleOpenChange(open: boolean) {
    if (open) setDraft(selectFilters(search))
    setIsOpen(open)
  }

  function handleApply() {
    setFilter(draft)
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger
        aria-label="Abrir filtros"
        className={cn(
          "flex items-center justify-center bg-[linear-gradient(180deg,rgb(210_138_76_/_0.4)_-17%,#d28a4c_109%)] text-primary-foreground",
          triggerClassName
        )}
      >
        <FilterIcon className="size-[22px]" />
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-8 px-4">
          <CatalogSort
            className="flex-col items-start"
            value={draft.sort ?? "recent"}
            onChange={(sort) =>
              setDraft((current) => ({
                ...current,
                sort: sort === "recent" ? undefined : sort,
              }))
            }
          />
          <FiltersPanel
            filters={draft}
            facets={data?.facets}
            isLoading={isPending}
            applyPriceOnChange
            onChange={(change) =>
              setDraft((current) => ({ ...current, ...change }))
            }
          />
        </div>
        <SheetFooter>
          <Button onClick={handleApply}>Aplicar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
