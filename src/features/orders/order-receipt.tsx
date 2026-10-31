import { Link } from "@tanstack/react-router"
import { CopyIcon, XIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { NftImage } from "@/components/nft-image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Network, Order } from "@/contracts"
import { formatDiscount, formatEth, isZeroEth } from "@/features/cart/format"
import {
  networkLabel,
  shortAddress,
  walletTypeLabel,
} from "@/features/wallets/labels"
import { notify } from "@/lib/notify"

const EXPLORER_NAMES: Record<Network, string> = {
  ethereum: "Etherscan",
  polygon: "Polygonscan",
  solana: "Solscan",
}

function formatOrderDate(iso: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(iso))
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ""
  const month = part("month").replace(".", "")

  return `${part("day")} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part("year")}`
}

function MetaItem({
  label,
  isStrong,
  children,
}: {
  label: string
  isStrong?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-w-0 border-primary py-1 sm:border-l sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
      <dt
        className={`text-[14px]/4 text-muted-foreground ${isStrong ? "font-bold" : ""}`}
      >
        {label}
      </dt>
      <dd className="text-[15px]/5 text-muted-foreground">{children}</dd>
    </div>
  )
}

function CopyTransaction({ reference }: { reference: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(reference)
      notify("ID da transação copiado.")
    } catch {
      notify("Não foi possível copiar o ID.")
    }
  }

  return (
    <span className="flex items-center gap-1.5">
      <span title={reference}>{shortAddress(reference)}</span>
      <button
        type="button"
        aria-label="Copiar ID da transação"
        onClick={() => void copy()}
        className="text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CopyIcon className="size-3.5" />
      </button>
    </span>
  )
}

export function OrderReceipt({ order }: { order: Order }) {
  const { snapshot } = order
  const reference = order.transactionRef
  const [isExplorerOpen, setIsExplorerOpen] = useState(false)

  return (
    <section
      aria-labelledby="receipt-title"
      className="relative mx-auto w-full max-w-[578px] border-b-10 border-primary bg-card max-md:-mx-6 max-md:w-auto"
    >
      <Link
        to="/"
        aria-label="Voltar ao catálogo"
        className="absolute top-4 right-4 text-primary"
      >
        <XIcon className="size-5" />
      </Link>
      <header className="flex flex-col items-center gap-4 px-6 pt-[22px] pb-[22px]">
        <img
          src="/images/brand/thank-you.svg"
          alt=""
          width={80}
          height={80}
          className="size-20"
        />
        <h1
          id="receipt-title"
          className="text-center text-[16px]/4 font-bold text-muted-foreground"
        >
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-primary px-6 py-3 sm:grid-cols-[auto_auto_auto_auto] sm:justify-between sm:gap-0 sm:px-9">
        <MetaItem label="ID da transação" isStrong>
          {reference ? (
            <CopyTransaction reference={reference} />
          ) : (
            "Indisponível"
          )}
        </MetaItem>
        <MetaItem label="Data">{formatOrderDate(order.createdAt)}</MetaItem>
        <MetaItem label="Total">{formatEth(snapshot.totalEth)}</MetaItem>
        <MetaItem label="Carteira" isStrong>
          {walletTypeLabel(snapshot.walletType)}
        </MetaItem>
      </dl>

      <div className="px-6 pt-5 pb-8 sm:px-11">
        <h2 className="text-[15px]/4 font-bold">Detalhes da transação</h2>
        <div
          aria-hidden="true"
          className="mt-3 flex justify-between border-b border-primary/60 pb-3 text-[16px]/4"
        >
          <span className="font-bold">NFTs</span>
          <span className="flex gap-12">
            <span className="font-bold">Edições</span>
            <span className="font-medium">Subtotal</span>
          </span>
        </div>

        <ul className="mt-3 flex flex-col gap-3">
          {snapshot.lines.map((line) => (
            <li
              key={`${line.nftId}:${line.editionId}`}
              className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-x-3 sm:flex"
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
                <h3 className="truncate text-[16px]/4 font-bold">
                  {line.name}
                </h3>
                <p className="mt-1.5 text-[14px]/4 text-subtle-foreground">
                  ID do token: {line.tokenId}
                </p>
                <p className="mt-1 text-[14px]/4 text-subtle-foreground">
                  Edição: {line.editionLabel}
                </p>
              </div>
              <div className="col-start-2 mt-2 flex items-center justify-between gap-5 sm:contents">
                <span className="shrink-0 text-[14px]/4 text-muted-foreground">
                  <span className="sr-only">Quantidade: </span>(x{" "}
                  {line.quantity})
                </span>
                <p className="shrink-0 text-right text-[18px]/4 font-bold text-brand-text">
                  <span className="sr-only">Subtotal: </span>
                  {formatEth(line.lineTotalEth)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-3 flex flex-col gap-3 border-b border-primary/60 pb-3 sm:pl-[169px]">
          {!isZeroEth(snapshot.discountEth) && (
            <div className="flex items-center justify-between">
              <dt className="text-[15px]/5">Desconto</dt>
              <dd className="text-[18px]/4">
                {formatDiscount(snapshot.discountEth)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-[15px]/5">Taxa de rede</dt>
            <dd className="text-[18px]/4">{formatEth(snapshot.feeEth)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[16px]/4 font-bold">Total</dt>
            <dd className="text-[18px]/4 font-bold text-brand-text">
              {formatEth(snapshot.totalEth)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-center text-[14px]/[22px] text-muted-foreground">
          Transação confirmada na {networkLabel(snapshot.network)}. A
          propriedade foi transferida para sua carteira conectada e registrada
          na rede.
        </p>
        <Button
          onClick={() => setIsExplorerOpen(true)}
          className="mx-auto mt-5 flex h-12 w-[187px] rounded-[6px] px-0 text-[15px] font-bold"
        >
          Ver no {EXPLORER_NAMES[snapshot.network]}
        </Button>
      </div>

      <Dialog open={isExplorerOpen} onOpenChange={setIsExplorerOpen}>
        <DialogContent className="h-auto max-md:inset-auto max-md:top-1/2 max-md:left-1/2 max-md:h-auto max-md:w-[calc(100%-32px)] max-md:-translate-x-1/2 max-md:-translate-y-1/2 max-md:bg-popover">
          <DialogTitle className="text-[18px]/6 font-bold">
            Link simulado
          </DialogTitle>
          <DialogDescription className="break-all">
            Esta compra é uma simulação, sem transação real na rede.
            {reference && ` Referência: ${reference}`}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </section>
  )
}
