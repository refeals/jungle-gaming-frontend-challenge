import type { Quote, QuoteLine } from "@/contracts"
import { formatDiscount, formatEth } from "@/features/cart/format"

function lineKey(line: QuoteLine) {
  return `${line.nftId}:${line.editionId}`
}

function describeLines(previous: Quote, current: Quote) {
  const before = new Map(previous.lines.map((line) => [lineKey(line), line]))
  const after = new Map(current.lines.map((line) => [lineKey(line), line]))
  const changes: string[] = []

  for (const line of current.lines) {
    const old = before.get(lineKey(line))
    const label = `${line.name}, edição ${line.editionLabel}`
    if (!old) {
      changes.push(`${label}: entrou no pedido.`)
      continue
    }
    if (old.unitPriceEth !== line.unitPriceEth) {
      changes.push(
        `${label}: de ${formatEth(old.unitPriceEth)} para ${formatEth(line.unitPriceEth)}.`
      )
    }
    if (old.quantity !== line.quantity) {
      changes.push(
        `${label}: quantidade de ${old.quantity} para ${line.quantity}.`
      )
    }
  }
  for (const line of previous.lines) {
    if (!after.has(lineKey(line))) {
      changes.push(`${line.name}, edição ${line.editionLabel}: saiu do pedido.`)
    }
  }

  return changes
}

function describeTotals(previous: Quote, current: Quote) {
  const changes: string[] = []

  if (previous.couponCode !== current.couponCode) {
    changes.push(
      current.couponCode
        ? `Cupom aplicado: ${current.couponCode}.`
        : `O cupom ${previous.couponCode} deixou de valer.`
    )
  }
  if (previous.discountEth !== current.discountEth) {
    changes.push(
      `Desconto: de ${formatDiscount(previous.discountEth)} para ${formatDiscount(current.discountEth)}.`
    )
  }
  if (previous.feeEth !== current.feeEth) {
    changes.push(
      `Taxa de rede: de ${formatEth(previous.feeEth)} para ${formatEth(current.feeEth)}.`
    )
  }
  if (previous.totalEth !== current.totalEth) {
    changes.push(
      `Total: de ${formatEth(previous.totalEth)} para ${formatEth(current.totalEth)}.`
    )
  }

  return changes
}

export function QuoteDiff({
  previous,
  current,
}: {
  previous: Quote
  current: Quote
}) {
  return (
    <div
      role="alert"
      className="rounded-[6px] border border-primary bg-card px-4 py-3"
    >
      <p className="text-[14px]/5 font-bold">
        Os valores mudaram. Revise antes de confirmar.
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-[14px]/5">
        {[
          ...describeLines(previous, current),
          ...describeTotals(previous, current),
        ].map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </div>
  )
}
