import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { CatalogPagination } from "@/features/catalog/catalog-pagination"
import { CatalogSort } from "@/features/catalog/catalog-sort"
import { CatalogTabs } from "@/features/catalog/catalog-tabs"
import { FeaturedNft } from "@/features/catalog/featured-nft"
import { FiltersDrawer } from "@/features/catalog/filters-drawer"
import { FiltersPanel } from "@/features/catalog/filters-panel"
import { NftGrid } from "@/features/catalog/nft-grid"
import { nftListOptions } from "@/features/catalog/queries"
import { toListQuery } from "@/features/catalog/search"
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters"

export function CatalogSection() {
  const { search, setFilter, goToPage, clearFilters } = useCatalogFilters()
  const listQuery = toListQuery(search)
  const query = useQuery(nftListOptions(listQuery))
  const { data, isPlaceholderData, isPending } = query
  const lastPage = data?.totalPages ?? 0
  const isPastLastPage =
    !isPlaceholderData && lastPage > 0 && listQuery.page > lastPage

  useEffect(() => {
    if (isPastLastPage) goToPage(lastPage)
  })

  return (
    <section
      id="catalog"
      aria-label="Catálogo de NFTs"
      className="scroll-mt-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[310px_842px] xl:justify-between xl:gap-0"
    >
      <aside className="hidden flex-col gap-6 lg:flex">
        <FiltersPanel
          filters={search}
          facets={data?.facets}
          isLoading={isPending}
          onChange={setFilter}
          className="bg-card p-5"
        />
        <FeaturedNft />
      </aside>

      <div className="min-w-0">
        <h2 className="sr-only">Todos os NFTs do catálogo</h2>
        <div className="flex items-center justify-between gap-4">
          <CatalogTabs active={listQuery.tab} />
          <div className="flex items-center gap-3">
            <CatalogSort
              value={listQuery.sort}
              onChange={(sort) =>
                setFilter({ sort: sort === "recent" ? undefined : sort })
              }
              className="hidden md:flex"
              labelClassName="hidden lg:inline"
            />
            <FiltersDrawer triggerClassName="hidden size-9 rounded-md md:flex lg:hidden" />
          </div>
        </div>

        <p role="status" className="sr-only">
          {data && !isPlaceholderData
            ? `${data.totalItems} NFTs encontrados`
            : ""}
        </p>

        <div className="mt-4 md:mt-8">
          <NftGrid query={query} onClearFilters={clearFilters} />
        </div>

        {data && (
          <CatalogPagination
            page={listQuery.page}
            totalPages={data.totalPages}
          />
        )}

        <FeaturedNft className="mx-auto mt-12 max-w-[310px] lg:hidden" />
      </div>
    </section>
  )
}
