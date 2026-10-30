import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { NftListQuery } from "@/contracts"
import { nftSort } from "@/contracts/nft"
import { sortLabels } from "@/features/catalog/labels"
import { cn } from "@/lib/utils"

type Sort = NftListQuery["sort"]

const options = nftSort.options.map((value) => ({
  value,
  label: sortLabels[value],
}))

type CatalogSortProps = {
  value: Sort
  onChange: (value: Sort) => void
  className?: string
  labelClassName?: string
}

export function CatalogSort({
  value,
  onChange,
  className,
  labelClassName,
}: CatalogSortProps) {
  return (
    <div className={cn("flex items-center gap-1 text-[15px]/5", className)}>
      <span aria-hidden="true" className={labelClassName}>
        Ordenar por:
      </span>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next)
        }}
      >
        <SelectTrigger
          aria-label="Ordenar por"
          className="h-auto! w-auto border-0 bg-transparent! p-0 text-[15px]/5 focus-visible:ring-2"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          align="end"
          className="w-56"
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
