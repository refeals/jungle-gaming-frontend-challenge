import { useQuery } from "@tanstack/react-query"
import { Link, Navigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { AccountError } from "@/features/account/account-states"
import { profileOptions } from "@/features/account/queries"
import { useAuthenticatedUser } from "@/features/auth/authenticated-user"
import { useSession } from "@/features/auth/session"
import { hasShortage } from "@/features/cart/cart-changes"
import { cartOptions } from "@/features/cart/queries"
import { CheckoutForm } from "@/features/checkout/checkout-form"
import { CheckoutSkeleton } from "@/features/checkout/checkout-skeleton"
import type { CheckoutStep } from "@/features/checkout/mobile-steps"
import { walletsOptions } from "@/features/wallets/queries"
import { notify } from "@/lib/notify"

function BackToCart({ message }: { message?: string }) {
  useEffect(() => {
    if (message) notify(message)
  }, [message])

  return <Navigate to="/cart" replace />
}

function NoWallet() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-[20px]/6 font-bold">Cadastre uma carteira</h1>
      <p className="text-[14px]/6 text-muted-foreground">
        Você precisa de uma carteira para concluir o pagamento.
      </p>
      <Link
        to="/wallets"
        search={{ redirect: "/checkout" }}
        className={buttonVariants()}
      >
        Ir para carteiras
      </Link>
    </div>
  )
}

export function CheckoutPage({ step }: { step: CheckoutStep }) {
  const user = useAuthenticatedUser()
  const { data: session } = useSession()
  const enabled = Boolean(session)
  const cart = useQuery({ ...cartOptions(`user:${user.id}`), enabled })
  const profile = useQuery({ ...profileOptions(user.id), enabled })
  const wallets = useQuery({ ...walletsOptions(user.id), enabled })
  const [hasEntered, setHasEntered] = useState(false)
  const isEntryRead = cart.isFetchedAfterMount && !cart.isFetching
  const hasFailedEntry = !hasEntered && isEntryRead && cart.isError

  if (!hasEntered && isEntryRead && !cart.isError) {
    setHasEntered(true)
  }

  if (
    hasFailedEntry ||
    (!cart.data && cart.isError) ||
    (!profile.data && profile.isError) ||
    (!wallets.data && wallets.isError)
  ) {
    return (
      <AccountError
        title="Não foi possível carregar o pagamento"
        onRetry={() => {
          void cart.refetch()
          void profile.refetch()
          void wallets.refetch()
        }}
      />
    )
  }

  if (!cart.data || !profile.data || !wallets.data || !hasEntered) {
    return <CheckoutSkeleton />
  }

  if (enabled && cart.data.items.length === 0) return <BackToCart />
  if (enabled && cart.data.items.some(hasShortage)) {
    return (
      <BackToCart message="Há itens sem disponibilidade. Ajuste o carrinho para finalizar." />
    )
  }
  if (wallets.data.length === 0) return <NoWallet />

  return (
    <CheckoutForm
      userId={user.id}
      cart={cart.data}
      profile={profile.data}
      wallets={wallets.data}
      step={step}
    />
  )
}
