import { MinusIcon, PlusIcon } from "lucide-react"

import { TrashIcon } from "@/components/icons"
import { NftImage } from "@/components/nft-image"
import type { CartItem } from "@/contracts"
import { availableToKeep, hasShortage } from "@/features/cart/cart-changes"
import { formatEth } from "@/features/cart/format"
import { useRemoveCartItem, useUpdateCartItem } from "@/features/cart/queries"
import { notify } from "@/lib/notify"

const STEP_BUTTON =
  "flex size-6 items-center justify-center rounded-full bg-secondary text-foreground aria-disabled:opacity-50 md:h-[30px] md:w-5 md:rounded-[20px] md:bg-primary md:text-primary-foreground"

export const CART_COLUMNS =
  "md:grid md:grid-cols-[minmax(0,1fr)_96px_84px_104px_24px] md:items-center md:gap-x-2 md:pr-6 xl:grid-cols-[minmax(0,1fr)_131px_128px_140px_24px]"

export function CartLine({
  item,
  changeLabels,
}: {
  item: CartItem
  changeLabels: string[]
}) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const isBusy = updateItem.isPending || removeItem.isPending
  const isShort = hasShortage(item)
  const limit = availableToKeep(item)
  const isSoldOut = limit === 0
  const isOverLimit = !isSoldOut && isShort
  const canDecrease = !isSoldOut && item.quantity > 1
  const canIncrease = !isSoldOut && item.quantity < limit
  const label = `${item.name}, edição ${item.editionLabel}`

  function setQuantity(quantity: number) {
    updateItem.mutate({ itemId: item.id, quantity })
  }

  function decrease() {
    if (isBusy) return
    if (isSoldOut) {
      notify(`${item.name} está esgotado. Remova o item para continuar.`)
      return
    }
    if (!canDecrease) {
      notify("Para tirar o último, use o botão de remover.")
      return
    }
    setQuantity(Math.min(item.quantity - 1, limit))
  }

  function increase() {
    if (isBusy) return
    if (isSoldOut) {
      notify(`${item.name} está esgotado. Remova o item para continuar.`)
      return
    }
    if (!canIncrease) {
      notify(`Limite de ${limit} para ${item.name}.`)
      return
    }
    setQuantity(item.quantity + 1)
  }

  function remove() {
    if (!isBusy) removeItem.mutate(item)
  }

  return (
    <li
      aria-busy={isBusy || undefined}
      className="overflow-hidden rounded-[14px] bg-card shadow-[0_6px_20px_rgb(10_6_4_/_0.45)] md:rounded-none md:shadow-none"
    >
      <div
        className={`relative flex min-h-[100px] md:min-h-[70px] ${CART_COLUMNS}`}
      >
        <div className="flex min-w-0 flex-1 items-stretch md:items-center">
          <NftImage
            image={item.image}
            sizes="100px"
            width={100}
            height={100}
            className="size-[100px] shrink-0 rounded-[14px] object-cover md:size-[70px] md:rounded-[6px]"
          />
          <div className="min-w-0 flex-1 py-3 pl-2.5 md:py-1 md:pl-4">
            <h2 className="truncate text-[15px]/4 font-bold md:text-[16px]/4">
              {item.name}
            </h2>
            <p className="mt-1.5 flex flex-wrap gap-x-2 text-[14px]/4 text-muted-foreground md:text-subtle-foreground">
              <span className="hidden md:inline">
                ID do token: {item.tokenId}
              </span>
              <span>Edição: {item.editionLabel}</span>
            </p>
            <p className="mt-4 text-[18px]/4 font-bold text-brand-text md:hidden">
              <span className="sr-only">Total da linha: </span>
              {formatEth(item.lineTotalEth)}
            </p>
          </div>
        </div>

        <p className="hidden text-[16px]/4 font-bold text-muted-foreground md:block">
          <span className="sr-only">Preço unitário: </span>
          {formatEth(item.unitPriceEth)}
        </p>

        <div className="absolute top-[38px] right-3 flex items-center gap-3 md:static">
          <button
            type="button"
            aria-label={`Diminuir quantidade de ${label}`}
            aria-disabled={isBusy || !canDecrease || undefined}
            onClick={decrease}
            className={STEP_BUTTON}
          >
            <MinusIcon className="size-4" />
          </button>
          <output
            aria-live="polite"
            aria-label={`Quantidade de ${label}`}
            className="min-w-[11px] text-center text-[16px]/[22px] md:text-[17px]/6"
          >
            {item.quantity}
          </output>
          <button
            type="button"
            aria-label={`Aumentar quantidade de ${label}`}
            aria-disabled={isBusy || !canIncrease || undefined}
            onClick={increase}
            className={STEP_BUTTON}
          >
            <PlusIcon className="size-4" />
          </button>
        </div>

        <p className="hidden text-[16px]/4 font-bold text-brand-text md:block">
          <span className="sr-only">Total da linha: </span>
          {formatEth(item.lineTotalEth)}
        </p>

        <button
          type="button"
          aria-label={`Remover ${label}`}
          aria-disabled={isBusy || undefined}
          onClick={remove}
          className="absolute right-3 bottom-2 flex size-6 items-center justify-center text-primary aria-disabled:opacity-50 md:static md:text-subtle-foreground"
        >
          <TrashIcon className="size-6" />
        </button>
      </div>

      {changeLabels.length > 0 && (
        <p className="border-t border-primary px-3 py-2 text-[13px]/4 font-bold text-brand-text md:px-4">
          {changeLabels.join(" · ")}
        </p>
      )}
      {item.reservedQuantity > 0 && (
        <p className="px-3 py-2 text-[13px]/4 text-muted-foreground md:px-4">
          {item.reservedQuantity} reservado para o pedido em processamento.
        </p>
      )}
      {isSoldOut && isShort && (
        <p className="px-3 py-2 text-[13px]/4 text-brand-text md:px-4">
          Esgotada. Remova este item para finalizar a compra.
        </p>
      )}
      {isOverLimit && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]/4 text-brand-text md:px-4">
          Só restam {limit} disponíveis.
          <button
            type="button"
            aria-disabled={isBusy || undefined}
            onClick={() => {
              if (!isBusy) setQuantity(limit)
            }}
            className="font-bold underline aria-disabled:opacity-50"
          >
            Ajustar para {limit}
          </button>
        </p>
      )}
    </li>
  )
}
