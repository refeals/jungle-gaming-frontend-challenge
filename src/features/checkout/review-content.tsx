import type { ReactNode } from "react"

import type { Quote } from "@/contracts"
import { QuoteDiff } from "@/features/checkout/quote-diff"
import { SummaryLines, SummaryValues } from "@/features/checkout/order-summary"
import {
  networkLabel,
  shortAddress,
  walletTypeLabel,
} from "@/features/checkout/wallet-connection"
import { hasSameValues } from "@/features/checkout/quote-queries"
import type { Wallet } from "@/contracts"

const PRIMARY =
  "flex h-[60px] w-full items-center justify-center rounded-[40px] bg-[linear-gradient(135deg,#d28a4c,rgb(210_138_76_/_0.8))] text-[15px]/4 font-bold text-primary-foreground aria-disabled:opacity-50 md:h-[45px] md:rounded-[6px] md:bg-primary md:bg-none"

export type ReviewProps = {
  quote: Quote
  reviewed: Quote
  wallet: Wallet
  walletType: Wallet["walletType"]
  blockedReason: string | null
  isPending: boolean
  isRenewed: boolean
  failure: ReactNode
  onConfirm: () => void
  onAcceptChanges: () => void
}

export function ReviewContent({
  quote,
  reviewed,
  wallet,
  walletType,
  blockedReason,
  isPending,
  isRenewed,
  failure,
  onConfirm,
  onAcceptChanges,
}: ReviewProps) {
  const hasChanges = !hasSameValues(reviewed, quote)

  return (
    <div className="flex flex-col gap-4">
      {hasChanges && <QuoteDiff previous={reviewed} current={quote} />}
      <SummaryLines lines={quote.lines} />
      <SummaryValues values={quote} />
      <p className="text-[14px]/5 text-muted-foreground">
        {walletTypeLabel(walletType)}, {wallet.nickname},{" "}
        {shortAddress(wallet.address)}, rede {networkLabel(quote.network)}.
      </p>
      {isRenewed && !hasChanges && (
        <p role="status" className="text-[14px]/5 text-brand-text">
          A cotação foi renovada, com os mesmos valores. Confirme para concluir.
        </p>
      )}
      {failure}
      {blockedReason && (
        <p role="status" className="text-[14px]/5 text-brand-text">
          {blockedReason}
        </p>
      )}
      {hasChanges ? (
        <button
          type="button"
          aria-disabled={Boolean(blockedReason) || undefined}
          onClick={() => {
            if (!blockedReason) onAcceptChanges()
          }}
          className={PRIMARY}
        >
          Confirmar novos valores
        </button>
      ) : (
        <button
          type="button"
          aria-disabled={Boolean(blockedReason) || isPending || undefined}
          onClick={onConfirm}
          className={PRIMARY}
        >
          {isPending ? "Enviando..." : "Confirmar compra"}
        </button>
      )}
    </div>
  )
}
