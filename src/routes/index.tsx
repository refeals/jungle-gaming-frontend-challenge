import { createFileRoute } from "@tanstack/react-router"

import { CatalogSection } from "@/features/catalog/catalog-section"
import { FiltersDrawer } from "@/features/catalog/filters-drawer"
import { HeroBanner } from "@/features/catalog/hero-banner"
import { featuredNftOptions, nftListOptions } from "@/features/catalog/queries"
import { toListQuery, validateCatalogSearch } from "@/features/catalog/search"
import { SearchInput } from "@/features/catalog/search-input"
import { JournalSection } from "@/features/home/journal-section"
import { PromoBanners } from "@/features/home/promo-banners"

function HomePage() {
  return (
    <div className="flex flex-col gap-4 md:gap-24">
      <div className="flex gap-2 md:hidden">
        <SearchInput className="min-w-0 flex-1" />
        <FiltersDrawer triggerClassName="size-[45px] rounded-[14px]" />
      </div>
      <HeroBanner />
      <CatalogSection />
      <div className="mt-20 flex flex-col gap-24 md:mt-0">
        <PromoBanners />
        <JournalSection />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => toListQuery(search),
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(nftListOptions(deps))
    void queryClient.prefetchQuery(featuredNftOptions())
  },
  component: HomePage,
})
