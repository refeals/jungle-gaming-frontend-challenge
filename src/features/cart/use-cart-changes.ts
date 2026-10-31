import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { queryKeys, type CartOwner } from "@/app/query-keys"
import type { Cart } from "@/contracts"
import {
  diffCarts,
  keepRelevantChanges,
  mergeChanges,
  type CartChange,
} from "@/features/cart/cart-changes"
import { useCartOwner } from "@/features/cart/cart-owner"

type SeenCart = {
  cart: Cart | undefined
  changes: CartChange[]
}

type TrackedCart = SeenCart & {
  owner: CartOwner | null
}

export function useCartChanges(cart: Cart | undefined) {
  const owner = useCartOwner()
  const queryClient = useQueryClient()

  function startTracking(): TrackedCart {
    const seen =
      owner && queryClient.getQueryData<SeenCart>(queryKeys.cart.seenBy(owner))
    return seen ? { owner, ...seen } : { owner, cart: undefined, changes: [] }
  }

  const [state, setState] = useState(startTracking)
  let tracked = state.owner === owner ? state : startTracking()

  if (owner && cart && cart !== tracked.cart) {
    const found = tracked.cart ? diffCarts(tracked.cart, cart) : []
    tracked = {
      owner,
      cart,
      changes: keepRelevantChanges(mergeChanges(tracked.changes, found), cart),
    }
  }

  if (tracked !== state) setState(tracked)

  const { cart: seenCart, changes } = tracked

  useEffect(() => {
    if (owner && seenCart) {
      queryClient.setQueryData<SeenCart>(queryKeys.cart.seenBy(owner), {
        cart: seenCart,
        changes,
      })
    }
  }, [changes, owner, queryClient, seenCart])

  return {
    changes,
    dismissChanges: () => setState((current) => ({ ...current, changes: [] })),
  }
}
