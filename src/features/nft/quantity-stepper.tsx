import { MinusIcon, PlusIcon } from "lucide-react"
import { useId } from "react"

import { cn } from "@/lib/utils"

const STEP_BUTTON =
  "flex h-[30px] w-6 items-center justify-center rounded-[20px] border border-background bg-primary text-primary-foreground disabled:opacity-50 md:h-[42px] md:w-[30px]"

type QuantityStepperProps = {
  value: number
  max: number
  onChange: (value: number) => void
  hintClassName?: string
}

export function QuantityStepper({
  value,
  max,
  onChange,
  hintClassName,
}: QuantityStepperProps) {
  const hintId = useId()
  const isAtLimit = max > 0 && value >= max

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
          className={STEP_BUTTON}
        >
          <MinusIcon className="size-4" />
        </button>
        <output
          aria-live="polite"
          aria-label="Quantidade"
          className="min-w-3 text-center text-[18px]/[25px] font-medium md:text-[20px]/[25px] md:font-normal"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          aria-describedby={isAtLimit ? hintId : undefined}
          disabled={isAtLimit || max === 0}
          onClick={() => onChange(value + 1)}
          className={STEP_BUTTON}
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
      <p
        id={hintId}
        className={cn("text-[12px]/4 text-muted-foreground", hintClassName)}
      >
        {isAtLimit && `Limite de ${max} por pedido`}
      </p>
    </>
  )
}
