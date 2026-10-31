import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import type { Cart } from "@/contracts"
import { useSession } from "@/features/auth/session"
import { CouponForm } from "@/features/cart/coupon-form"
import { formatDiscount, formatEth } from "@/features/cart/format"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

const CHECKOUT_BUTTON =
  "flex h-[60px] w-full items-center justify-center rounded-[40px] bg-[linear-gradient(135deg,#d28a4c,rgb(210_138_76_/_0.8))] text-[16px]/4 font-bold text-primary-foreground aria-disabled:opacity-50 md:h-10 md:rounded-[3px] md:bg-primary md:bg-none md:text-[15px]/4"
const BLOCKED_MESSAGE =
  "Remova ou ajuste os itens indisponíveis para finalizar."

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[15px]/5">{label}</dt>
      <dd className={cn("shrink-0 text-right", valueClassName)}>{value}</dd>
    </div>
  )
}

function ValueSkeleton() {
  return <SkeletonShimmer className="h-4 w-20" />
}

function CheckoutAction({
  isBlocked,
  isLoading,
}: {
  isBlocked: boolean
  isLoading: boolean
}) {
  const { data: session, isPending } = useSession()

  if (isBlocked || isLoading || isPending) {
    return (
      <button
        type="button"
        aria-disabled="true"
        onClick={() => {
          if (isBlocked) notify(BLOCKED_MESSAGE)
        }}
        className={CHECKOUT_BUTTON}
      >
        Conectar e finalizar
      </button>
    )
  }

  if (session) {
    return (
      <Link to="/checkout" className={CHECKOUT_BUTTON}>
        Conectar e finalizar
      </Link>
    )
  }

  return (
    <Link
      to="/cart"
      state={{ authOpenedInPage: true }}
      search={{ auth: "login", redirect: "/checkout" }}
      className={CHECKOUT_BUTTON}
    >
      Conectar e finalizar
    </Link>
  )
}

export function CartSummary({
  cart,
  isRefreshing,
  isStale,
}: {
  cart: Cart | undefined
  isRefreshing: boolean
  isStale: boolean
}) {
  const summary = cart?.summary
  const isBlocked =
    cart?.items.some(
      (item) => item.isSoldOut || item.quantity > item.maxQuantity
    ) ?? false

  return (
    <aside
      data-cart-summary
      aria-labelledby="cart-summary-title"
      aria-busy={!cart || isRefreshing || undefined}
      className="z-30 -mx-6 rounded-t-[40px] bg-card px-6 pt-6 pb-9 md:mx-0 md:rounded-none md:bg-transparent md:p-0 lg:self-start max-md:[@media(min-height:700px)]:sticky max-md:[@media(min-height:700px)]:bottom-0"
    >
      <h2
        id="cart-summary-title"
        className="border-b border-primary pb-3 text-[18px]/4 font-bold max-md:sr-only"
      >
        Resumo da carteira
      </h2>

      <div className="mb-3 md:mt-6 md:mb-6">
        {cart ? (
          <CouponForm couponCode={cart.couponCode} />
        ) : (
          <SkeletonShimmer className="h-[50px] rounded-[40px] md:h-[64px] md:rounded-[3px]" />
        )}
      </div>

      <dl className="flex flex-col gap-3">
        <SummaryRow
          label="Subtotal"
          valueClassName="text-[16px]/4 md:text-[18px]/4"
          value={summary ? formatEth(summary.subtotalEth) : <ValueSkeleton />}
        />
        <SummaryRow
          label="Desconto do lançamento"
          valueClassName="text-[15px]/5"
          value={
            summary ? formatDiscount(summary.discountEth) : <ValueSkeleton />
          }
        />
        <div>
          <SummaryRow
            label="Taxa de rede"
            valueClassName="text-[16px]/4 md:text-[18px]/4"
            value={summary ? formatEth(summary.feeEth) : <ValueSkeleton />}
          />
          <p className="text-right text-[12px]/4 text-brand-text md:mt-3">
            Taxa estimada
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 md:mt-3">
          <dt className="text-[16px]/4 font-bold">Total</dt>
          <dd className="text-right text-[18px]/4 font-bold text-brand-text">
            {summary ? formatEth(summary.totalEth) : <ValueSkeleton />}
          </dd>
        </div>
      </dl>

      <div className="mt-8 md:mt-6">
        <CheckoutAction isBlocked={isBlocked} isLoading={!cart || isStale} />
        {isBlocked && (
          <p
            role="status"
            className="mt-2 text-center text-[13px]/4 text-brand-text"
          >
            {BLOCKED_MESSAGE}
          </p>
        )}
        <Link
          to="/"
          hash="catalog"
          className="mt-3 hidden text-center text-[15px]/5 text-brand-text md:block"
        >
          Continuar explorando
        </Link>
      </div>
    </aside>
  )
}
