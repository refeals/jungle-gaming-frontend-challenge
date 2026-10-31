import { useRemoveCoupon } from "@/features/cart/queries"

export function ExpiredCouponNotice({ code }: { code: string | null }) {
  const removeCoupon = useRemoveCoupon()

  if (!code) return null

  return (
    <p role="status" className="mb-3 text-[13px]/5 text-brand-text">
      O cupom {code} expirou e saiu do cálculo.{" "}
      <button
        type="button"
        aria-disabled={removeCoupon.isPending || undefined}
        onClick={() => {
          if (!removeCoupon.isPending) removeCoupon.mutate()
        }}
        className="font-bold underline aria-disabled:opacity-50"
      >
        Entendi
      </button>
    </p>
  )
}
