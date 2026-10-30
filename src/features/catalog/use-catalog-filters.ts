import { getRouteApi } from "@tanstack/react-router"

import type { CatalogSearch } from "@/features/catalog/search"

const homeRoute = getRouteApi("/")

export type CatalogFilters = Omit<CatalogSearch, "page" | "q">

export function useCatalogFilters() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  function setFilter(change: CatalogFilters) {
    void navigate({
      search: (prev) => ({ ...prev, ...change, page: undefined }),
      resetScroll: false,
    })
  }

  function goToPage(page: number) {
    void navigate({
      search: (prev) => ({ ...prev, page }),
      replace: true,
      resetScroll: false,
    })
  }

  function clearFilters() {
    void navigate({
      search: ({ auth, redirect }) => ({ auth, redirect }),
      resetScroll: false,
    })
  }

  return { search, setFilter, goToPage, clearFilters }
}
