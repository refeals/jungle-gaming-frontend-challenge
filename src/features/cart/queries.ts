import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect } from "react"

import {
  addCartItem,
  applyCartCoupon,
  getCart,
  removeCartCoupon,
  removeCartItem,
  updateCartItem,
} from "@/api/cart"
import { ApiError } from "@/api/errors"
import { queryClient as appQueryClient, staleTimes } from "@/app/query-client"
import { queryKeys, type CartOwner } from "@/app/query-keys"
import type { AddCartItemInput, Cart, CartItem } from "@/contracts"
import { useSession } from "@/features/auth/session"
import { getToken } from "@/features/auth/token-storage"
import {
  getCurrentCartOwner,
  useCartOwner,
  useGuestCartId,
} from "@/features/cart/cart-owner"
import {
  clearGuestCartId,
  getGuestCartId,
  setGuestCartId,
} from "@/features/cart/guest-cart-id"
import {
  hasMergeFailed,
  mergeGuestCart,
  notifyMergeAdjustments,
} from "@/features/cart/guest-cart-merge"
import { notify } from "@/lib/notify"

const CART_MUTATION_KEY = ["cart"] as const
const FALLBACK_OWNER: CartOwner = "guest:none"

export function cartOptions(owner: CartOwner) {
  return queryOptions({
    queryKey: queryKeys.cart.detail(owner),
    queryFn: ({ signal }) => getCart(signal),
    staleTime: staleTimes.cart,
  })
}

export function useCart() {
  const owner = useCartOwner()

  return useQuery({
    ...cartOptions(owner ?? FALLBACK_OWNER),
    enabled: owner !== null,
  })
}

export function useCartCount() {
  return useCart().data?.items.reduce((count, item) => count + item.quantity, 0)
}

export function cartLinkLabel(count: number | undefined) {
  if (count === undefined) return "Carrinho"
  return `Carrinho, ${count} ${count === 1 ? "item" : "itens"}`
}

function writeCartResponse(owner: CartOwner | null, cart: Cart) {
  if (owner?.startsWith("guest:")) {
    if (!cart.id) return
    if (!getToken()) {
      appQueryClient.setQueryData(
        queryKeys.cart.detail(`guest:${cart.id}`),
        cart
      )
    }
    if (cart.id !== getGuestCartId()) setGuestCartId(cart.id)
    return
  }

  if (owner) {
    appQueryClient.setQueryData<Cart>(
      queryKeys.cart.detail(owner),
      (current) => current && cart
    )
  }
}

function invalidateCartUnlessBusy(ownMutations: number) {
  const inFlight = appQueryClient.isMutating({
    mutationKey: CART_MUTATION_KEY,
  })
  if (inFlight === ownMutations) {
    void appQueryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  }
}

function notifyCartError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return
  notify(
    error instanceof ApiError
      ? error.message
      : "Não foi possível atualizar o carrinho."
  )
}

function useCartMutation<Variables>(
  mutationFn: (variables: Variables) => Promise<Cart>,
  onDone?: (variables: Variables, owner: CartOwner | null) => void,
  onError: (error: unknown) => void = notifyCartError
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all })
      return { owner: getCurrentCartOwner() }
    },
    onSuccess: (cart, variables, context) => {
      writeCartResponse(context.owner, cart)
      onDone?.(variables, context.owner)
    },
    onError,
    onSettled: () => invalidateCartUnlessBusy(1),
  })
}

export function useAddToCart(onAdded?: () => void) {
  return useCartMutation(
    (input: AddCartItemInput) => addCartItem(input),
    onAdded
  )
}

type UpdateCartItem = {
  itemId: string
  quantity: number
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: UpdateCartItem) =>
    updateCartItem(itemId, quantity)
  )
}

async function restoreCartItem(owner: CartOwner | null, item: CartItem) {
  if (getCurrentCartOwner() !== owner) {
    notify("Não é mais possível desfazer a remoção.")
    return
  }

  try {
    writeCartResponse(
      owner,
      await addCartItem({
        nftId: item.nftId,
        editionId: item.editionId,
        quantity: item.quantity,
      })
    )
  } catch (error) {
    notifyCartError(error)
  } finally {
    invalidateCartUnlessBusy(0)
  }
}

export function useRemoveCartItem() {
  return useCartMutation(
    (item: CartItem) => removeCartItem(item.id),
    (item, owner) => {
      notify(`${item.name}, edição ${item.editionLabel}, removido.`, {
        label: "Desfazer",
        onClick: () => void restoreCartItem(owner, item),
      })
    }
  )
}

export function useApplyCoupon() {
  return useCartMutation(applyCartCoupon, undefined, (error) => {
    if (error instanceof ApiError && Object.keys(error.fields).length > 0)
      return
    notifyCartError(error)
  })
}

export function useRemoveCoupon() {
  return useCartMutation(removeCartCoupon)
}

export function useGuestCartMergeRetry() {
  const { data: session } = useSession()
  const guestCartId = useGuestCartId()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId || !guestCartId || hasMergeFailed(guestCartId)) return

    void mergeGuestCart(guestCartId).then((merged) => {
      if (!merged || getGuestCartId() !== guestCartId) return

      clearGuestCartId()
      notifyMergeAdjustments(merged.adjustments)
      void appQueryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    })
  }, [guestCartId, userId])
}
