import { useState, type ReactNode } from "react"

import { NftImage } from "@/components/nft-image"
import type { CartSummary, QuoteLine } from "@/contracts"
import { CouponForm } from "@/features/cart/coupon-form"
import { formatDiscount, formatEth } from "@/features/cart/format"

function ValueRow({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
      <dt className="text-[15px]/5">{label}</dt>
      <dd className="text-right text-[16px]/4 md:text-[18px]/4">{value}</dd>
      {hint && (
        <dd className="col-span-2 mt-2 text-center text-[12px]/4 text-brand-text">
          {hint}
        </dd>
      )}
    </div>
  )
}

export function SummaryLines({ lines }: { lines: QuoteLine[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {lines.map((line) => (
        <li
          key={`${line.nftId}:${line.editionId}`}
          className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-x-2 rounded-[3px] bg-card px-1 py-1 md:flex"
        >
          <div className="row-span-2 shrink-0">
            <NftImage
              image={line.image}
              sizes="70px"
              width={70}
              height={70}
              className="size-[70px] rounded-[8px] object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px]/4 font-bold">{line.name}</h3>
            <p className="mt-1.5 text-[14px]/4 text-subtle-foreground">
              ID do token: {line.tokenId}
            </p>
            <p className="mt-1 text-[14px]/4 text-subtle-foreground">
              Edição: {line.editionLabel}
            </p>
          </div>
          <div className="col-start-2 mt-2 flex items-center justify-between gap-2 pr-1 md:contents">
            <span className="shrink-0 text-[14px]/4 text-muted-foreground">
              <span className="sr-only">Quantidade: </span>(x {line.quantity})
            </span>
            <p className="shrink-0 pr-1 text-right text-[18px]/4 font-bold text-brand-text">
              <span className="sr-only">Subtotal: </span>
              {formatEth(line.lineTotalEth)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function SummaryValues({ values }: { values: CartSummary }) {
  return (
    <dl className="flex flex-col gap-3">
      <ValueRow label="Subtotal" value={formatEth(values.subtotalEth)} />
      <ValueRow
        label="Desconto do lançamento"
        value={formatDiscount(values.discountEth)}
      />
      <ValueRow
        label="Taxa de rede"
        value={formatEth(values.feeEth)}
        hint="Taxa estimada"
      />
      <div className="flex items-center justify-between gap-4 border-t border-primary/60 pt-3">
        <dt className="text-[16px]/4 font-bold">Total</dt>
        <dd className="text-right text-[18px]/4 font-bold text-brand-text">
          {formatEth(values.totalEth)}
        </dd>
      </div>
    </dl>
  )
}

export function CouponSection({ couponCode }: { couponCode: string | null }) {
  const [isOpen, setIsOpen] = useState(false)

  if (couponCode || isOpen) return <CouponForm couponCode={couponCode} />

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="block w-full text-center text-[14px]/4"
    >
      Tem um código promocional? Aplique aqui
    </button>
  )
}

export function OrderSummary({
  lines,
  values,
  couponCode,
  isBusy,
}: {
  lines: QuoteLine[]
  values: CartSummary
  couponCode: string | null
  isBusy: boolean
}) {
  return (
    <section
      aria-labelledby="checkout-summary-title"
      aria-busy={isBusy || undefined}
    >
      <h2 id="checkout-summary-title" className="text-[17px]/4 font-bold">
        Seus NFTs
      </h2>
      <div
        aria-hidden="true"
        className="mt-3 mb-3 flex justify-between border-b border-primary/60 pb-3 text-[16px]/4"
      >
        <span className="font-bold">NFTs</span>
        <span className="font-medium">Subtotal</span>
      </div>
      <SummaryLines lines={lines} />
      <div className="mt-3 mb-3">
        <CouponSection couponCode={couponCode} />
      </div>
      <SummaryValues values={values} />
    </section>
  )
}
