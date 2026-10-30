import type { ReactNode } from "react"

import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import type { Network, NftCategory, NftFacets } from "@/contracts"
import { network as networkSchema, nftCategory } from "@/contracts/common"
import { categoryLabels, networkLabels } from "@/features/catalog/labels"
import { PriceRange } from "@/features/catalog/price-range"
import type { CatalogFilters } from "@/features/catalog/use-catalog-filters"
import { cn } from "@/lib/utils"

type FiltersPanelProps = {
  filters: CatalogFilters
  facets: NftFacets | undefined
  isLoading: boolean
  onChange: (change: CatalogFilters) => void
  applyPriceOnChange?: boolean
  className?: string
}

type FacetRowProps = {
  label: string
  count: number | undefined
  isLoading: boolean
  isSelected: boolean
  onToggle: () => void
  countClassName?: string
}

function FacetRow({
  label,
  count,
  isLoading,
  isSelected,
  onToggle,
  countClassName,
}: FacetRowProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        disabled={count === 0 && !isSelected}
        onClick={onToggle}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-[15px]/5 text-muted-foreground hover:text-brand-text disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:hover:text-subtle-foreground",
          isSelected && "font-bold text-brand-text"
        )}
      >
        <span>{label}</span>
        {isLoading && count === undefined ? (
          <SkeletonShimmer className="h-3 w-7" />
        ) : (
          count !== undefined && (
            <span className={countClassName}>({count})</span>
          )
        )}
      </button>
    </li>
  )
}

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-[18px]/4 font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function FiltersPanel({
  filters,
  facets,
  isLoading,
  onChange,
  applyPriceOnChange,
  className,
}: FiltersPanelProps) {
  const categoryCount = (value: NftCategory) =>
    facets?.categories.find((facet) => facet.value === value)?.count
  const networkCount = (value: Network) =>
    facets?.networks.find((facet) => facet.value === value)?.count

  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <FilterGroup title="Coleções">
        <ul className="mt-1">
          {nftCategory.options.map((value) => (
            <FacetRow
              key={value}
              label={categoryLabels[value]}
              count={categoryCount(value)}
              isLoading={isLoading}
              isSelected={filters.collection === value}
              countClassName="font-bold"
              onToggle={() =>
                onChange({
                  collection: filters.collection === value ? undefined : value,
                })
              }
            />
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Faixa de preço">
        <PriceRange
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          bounds={facets?.priceRange}
          applyOnChange={applyPriceOnChange}
          onApply={onChange}
        />
      </FilterGroup>

      <FilterGroup title="Rede">
        <ul className="mt-1">
          {networkSchema.options.map((value) => (
            <FacetRow
              key={value}
              label={networkLabels[value]}
              count={networkCount(value)}
              isLoading={isLoading}
              isSelected={filters.network === value}
              onToggle={() =>
                onChange({
                  network: filters.network === value ? undefined : value,
                })
              }
            />
          ))}
        </ul>
      </FilterGroup>
    </div>
  )
}
