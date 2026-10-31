import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useId, useRef, useState } from "react"
import { useForm } from "react-hook-form"

import type { CouponInput } from "@/contracts"
import { couponInput } from "@/contracts/cart"
import { useApplyCoupon, useRemoveCoupon } from "@/features/cart/queries"
import { applyApiError } from "@/lib/form-errors"

const FIELD_NAMES = ["code"] as const
const COUPON_ROW =
  "flex h-[50px] overflow-hidden rounded-[40px] border border-border bg-card shadow-[0_6px_20px_rgb(10_6_4_/_0.45)] focus-within:ring-3 focus-within:ring-ring/50 md:h-10 md:rounded-[3px] md:border-primary md:bg-transparent md:shadow-none"
const COUPON_LABEL = "mb-2 block text-[14px]/4 font-bold max-md:sr-only"
const COUPON_ACTION =
  "w-[97px] shrink-0 bg-[linear-gradient(90deg,rgb(210_138_76_/_0.54),#d28a4c)] text-[15px]/4 font-bold text-foreground outline-none aria-disabled:opacity-50 md:w-[102px] md:bg-primary md:bg-none md:text-primary-foreground"

type CouponStepProps = {
  shouldFocus: boolean
  onSubmitted: () => void
}

function AppliedCoupon({
  couponCode,
  shouldFocus,
  onSubmitted,
}: CouponStepProps & { couponCode: string }) {
  const removeCoupon = useRemoveCoupon()
  const removeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (shouldFocus && document.activeElement === document.body) {
      removeRef.current?.focus()
    }
  }, [shouldFocus])

  function remove() {
    if (removeCoupon.isPending) return
    onSubmitted()
    removeCoupon.mutate()
  }

  return (
    <div>
      <p className={COUPON_LABEL}>Código promocional</p>
      <div className={COUPON_ROW}>
        <p className="flex min-w-0 flex-1 items-center truncate px-4 text-[14px]/4 font-bold md:px-2">
          <span className="sr-only">Código aplicado: </span>
          {couponCode}
        </p>
        <button
          ref={removeRef}
          type="button"
          aria-label={`Remover código ${couponCode}`}
          aria-disabled={removeCoupon.isPending || undefined}
          onClick={remove}
          className={COUPON_ACTION}
        >
          Remover
        </button>
      </div>
    </div>
  )
}

function CouponEntry({ shouldFocus, onSubmitted }: CouponStepProps) {
  const applyCoupon = useApplyCoupon()
  const inputId = useId()
  const errorId = useId()
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponInput),
    defaultValues: { code: "" },
  })

  useEffect(() => {
    if (shouldFocus && document.activeElement === document.body) {
      setFocus("code")
    }
  }, [setFocus, shouldFocus])

  function submit({ code }: CouponInput) {
    if (applyCoupon.isPending) return
    onSubmitted()
    applyCoupon.mutate(code, {
      onError: (error) => {
        applyApiError(error, FIELD_NAMES, setError)
      },
    })
  }

  const error = errors.code?.message

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <label htmlFor={inputId} className={COUPON_LABEL}>
        Código promocional
      </label>
      <div className={COUPON_ROW}>
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 text-[13px]/[22px] outline-none placeholder:text-subtle-foreground md:px-2 md:text-[12px]/4"
          {...register("code")}
        />
        <button
          type="submit"
          aria-disabled={applyCoupon.isPending || undefined}
          className={COUPON_ACTION}
        >
          Aplicar
        </button>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[13px]/4 text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  )
}

export function CouponForm({ couponCode }: { couponCode: string | null }) {
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const stepProps = {
    shouldFocus: hasSubmitted,
    onSubmitted: () => setHasSubmitted(true),
  }

  return couponCode ? (
    <AppliedCoupon couponCode={couponCode} {...stepProps} />
  ) : (
    <CouponEntry {...stepProps} />
  )
}
