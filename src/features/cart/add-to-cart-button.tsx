import { CartIcon } from "@/components/icons"
import type { Nft } from "@/contracts"
import { useAddToCart } from "@/features/cart/queries"
import { isSoldOut, resolveEdition } from "@/features/nft/editions"
import { notify } from "@/lib/notify"

export function AddToCartButton({
  nft,
  className,
}: {
  nft: Nft
  className?: string
}) {
  const addToCart = useAddToCart(() =>
    notify(`${nft.name} adicionado ao carrinho.`)
  )
  const soldOut = isSoldOut(nft)

  function handleClick() {
    if (addToCart.isPending) return

    if (soldOut) {
      notify(`${nft.name} está esgotado.`)
      return
    }

    addToCart.mutate({
      nftId: nft.id,
      editionId: resolveEdition(nft, undefined).edition.id,
      quantity: 1,
    })
  }

  return (
    <button
      type="button"
      aria-label={`Adicionar ${nft.name} ao carrinho`}
      aria-disabled={soldOut || addToCart.isPending || undefined}
      onClick={handleClick}
      className={className}
    >
      <CartIcon className="h-3.5 w-[15px]" />
    </button>
  )
}
