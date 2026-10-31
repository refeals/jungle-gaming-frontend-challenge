import { useEffect, useRef } from "react"

import { BackButton } from "@/components/back-button"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { AccountError } from "@/features/account/account-states"
import { useSession } from "@/features/auth/session"
import { CartChangesNotice } from "@/features/cart/cart-changes-notice"
import { changeLabelsFor } from "@/features/cart/cart-changes"
import { CartEmpty } from "@/features/cart/cart-empty"
import { CART_COLUMNS, CartLine } from "@/features/cart/cart-line"
import { CartLinesSkeleton } from "@/features/cart/cart-skeleton"
import { CartSummary } from "@/features/cart/cart-summary"
import { useCart } from "@/features/cart/queries"
import { useCartChanges } from "@/features/cart/use-cart-changes"
import { RecommendedNfts } from "@/features/cart/recommended-nfts"

function CartTableHeader() {
  return (
    <div
      aria-hidden="true"
      className={`hidden border-b border-primary pb-3 text-[16px]/4 font-medium md:grid ${CART_COLUMNS}`}
    >
      <span className="font-bold">NFTs</span>
      <span>Preço</span>
      <span className="font-bold">Edições</span>
      <span>Total</span>
    </div>
  )
}

export function CartPage() {
  const session = useSession()
  const cart = useCart()
  const { changes, dismissChanges } = useCartChanges(cart.data)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const items = cart.data?.items
  const itemCount = items?.length
  const previousCount = useRef(itemCount)
  const isStale = cart.isRefetchError
  const hasFailed =
    !cart.data && (cart.isError || (!session.data && session.isError))

  useEffect(() => {
    const previous = previousCount.current
    previousCount.current = itemCount
    if (
      previous !== undefined &&
      itemCount !== undefined &&
      itemCount !== previous &&
      document.activeElement === document.body
    ) {
      headingRef.current?.focus()
    }
  }, [itemCount])

  function retry() {
    if (session.isError) {
      void session.refetch()
      return
    }
    void cart.refetch()
  }

  return (
    <>
      <div className="hidden md:block">
        <Breadcrumbs
          items={[
            { label: "Início", to: "/" },
            { label: "Mercado", to: "/" },
            { label: "Carrinho" },
          ]}
        />
      </div>

      <div className="relative mb-3 flex h-[35px] items-center justify-center md:mb-0 md:h-auto">
        <div className="absolute left-0 md:hidden">
          <BackButton />
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[20px]/4 font-bold outline-none md:sr-only"
        >
          Carrinho de NFTs
        </h1>
      </div>

      <CartChangesNotice changes={changes} onDismiss={dismissChanges} />

      {isStale && (
        <p role="alert" className="mb-4 text-[14px]/5 text-brand-text md:mt-3">
          Não foi possível atualizar o carrinho, e os valores podem estar
          desatualizados.{" "}
          <button
            type="button"
            onClick={() => void cart.refetch()}
            className="font-bold underline"
          >
            Tentar novamente
          </button>
        </p>
      )}

      {hasFailed && (
        <AccountError
          title="Não foi possível carregar seu carrinho"
          onRetry={retry}
        />
      )}
      {!hasFailed && items?.length === 0 && <CartEmpty />}
      {!hasFailed && items?.length !== 0 && (
        <div className="flex flex-col gap-6 md:mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-10 xl:gap-[86px]">
          <div>
            <CartTableHeader />
            <div className="md:mt-3">
              {items ? (
                <ul className="flex flex-col gap-5 md:gap-3">
                  {items.map((item) => (
                    <CartLine
                      key={item.id}
                      item={item}
                      changeLabels={changeLabelsFor(item, changes)}
                    />
                  ))}
                </ul>
              ) : (
                <CartLinesSkeleton />
              )}
            </div>
          </div>
          <CartSummary
            cart={cart.data}
            isRefreshing={cart.isFetching}
            isStale={isStale}
          />
        </div>
      )}

      <RecommendedNfts cartItems={items ?? []} />
    </>
  )
}
