import Big from "big.js"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { NftFacets } from "@/contracts"

export type PriceSelection = {
  minPrice: string | undefined
  maxPrice: string | undefined
}

type PriceRangeProps = PriceSelection & {
  bounds: NftFacets["priceRange"] | undefined
  onApply: (selection: PriceSelection) => void
  applyOnChange?: boolean
}

const STEPS_PER_ETH = 100

function toStep(eth: string, roundUp: boolean) {
  return new Big(eth)
    .times(STEPS_PER_ETH)
    .round(0, roundUp ? Big.roundUp : Big.roundDown)
    .toNumber()
}

function toEth(step: number) {
  return new Big(step).div(STEPS_PER_ETH).toFixed(2)
}

function formatEth(step: number) {
  return toEth(step).replace(".", ",")
}

export function PriceRange({
  minPrice,
  maxPrice,
  bounds,
  onApply,
  applyOnChange = false,
}: PriceRangeProps) {
  const [draft, setDraft] = useState<[number, number] | null>(null)
  const [appliedKey, setAppliedKey] = useState(`${minPrice}-${maxPrice}`)
  const key = `${minPrice}-${maxPrice}`

  if (key !== appliedKey) {
    setAppliedKey(key)
    setDraft(null)
  }

  if (!bounds) {
    return (
      <p className="mt-3 pl-3 text-[15px]/5 text-muted-foreground">
        Preço indisponível
      </p>
    )
  }

  const lowest = toStep(bounds.minEth, false)
  const highest = toStep(bounds.maxEth, true)
  const clamp = (step: number) => Math.min(Math.max(step, lowest), highest)
  const low = clamp(draft?.[0] ?? (minPrice ? toStep(minPrice, false) : lowest))
  const high = clamp(
    draft?.[1] ?? (maxPrice ? toStep(maxPrice, true) : highest)
  )

  function toSelection(lowStep: number, highStep: number): PriceSelection {
    return {
      minPrice: lowStep === lowest ? undefined : toEth(lowStep),
      maxPrice: highStep === highest ? undefined : toEth(highStep),
    }
  }

  function handleChange(value: number | readonly number[]) {
    if (typeof value === "number") return
    const next: [number, number] = [value[0], value[1]]
    setDraft(next)
    if (applyOnChange) onApply(toSelection(next[0], next[1]))
  }

  return (
    <div className="mt-3 flex flex-col gap-3 pl-3">
      <Slider
        min={lowest}
        max={highest}
        value={[low, high]}
        disabled={lowest === highest}
        thumbLabels={["Preço mínimo", "Preço máximo"]}
        getThumbValueText={(step) => `${formatEth(step)} ETH`}
        onValueChange={handleChange}
        className="py-1.5"
      />
      <p className="text-[15px]/5">
        Preço: {formatEth(low)} - {formatEth(high)} ETH
      </p>
      {!applyOnChange && (
        <Button
          size="sm"
          className="h-9 w-[92px] px-0"
          onClick={() => {
            setDraft(null)
            onApply(toSelection(low, high))
          }}
        >
          Aplicar
        </Button>
      )}
    </div>
  )
}
