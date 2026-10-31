import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { ApiError } from "@/api/errors"
import { createOrder } from "@/api/orders"
import { queryKeys } from "@/app/query-keys"
import type { CreateOrderInput, Order, Session } from "@/contracts"
import { quote as quoteSchema } from "@/contracts/quote"
import {
  getAttempt,
  isUnconfirmed,
  resetAttempt,
  updateAttempt,
} from "@/features/checkout/idempotency"
import { ORDER_MUTATION_KEY } from "@/features/checkout/quote-queries"
import { setPendingOrderId } from "@/features/orders/pending-order-storage"
import { notify } from "@/lib/notify"

type SubmitVariables = {
  key: string
  input: CreateOrderInput
  isRetry?: boolean
}

function pendingOrderIdOf(error: ApiError) {
  const { details } = error
  if (typeof details !== "object" || details === null) return null
  const { orderId } = details as { orderId?: unknown }
  return typeof orderId === "string" ? orderId : null
}

export function useSubmitOrder(userId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const router = useRouter()
  const [isAwaitingRetry, setIsAwaitingRetry] = useState(() =>
    isUnconfirmed(getAttempt(userId))
  )

  function isSameUser() {
    const session = queryClient.getQueryData<Session | null>(queryKeys.session)
    return session?.user.id === userId
  }

  function goToOrder(orderId: string) {
    setPendingOrderId(orderId)
    if (router.state.location.pathname === "/checkout") {
      void navigate({ to: "/orders/$orderId", params: { orderId } })
    }
  }

  function handleSuccess(order: Order) {
    if (!isSameUser()) return

    updateAttempt(userId, { orderId: order.id, input: undefined })
    goToOrder(order.id)
  }

  function restart(message: string) {
    resetAttempt(userId)
    setIsAwaitingRetry(false)
    notify(message)
  }

  function handleError(error: unknown, { isRetry }: SubmitVariables) {
    if (!isSameUser() && !(error instanceof ApiError && error.status === 401)) {
      return
    }

    if (!(error instanceof ApiError) || error.transient) {
      setIsAwaitingRetry(true)
      return
    }

    switch (error.code) {
      case "quote_stale": {
        resetAttempt(userId)
        setIsAwaitingRetry(false)
        const { quote: fresh } = (error.details ?? {}) as { quote?: unknown }
        const parsed = quoteSchema.safeParse(fresh)
        if (parsed.success) {
          queryClient.setQueriesData(
            { queryKey: queryKeys.quote.all },
            parsed.data
          )
        }
        if (isRetry) notify("Os valores mudaram. Revise o pedido e confirme.")
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
        return
      }
      case "availability_conflict":
        resetAttempt(userId)
        setIsAwaitingRetry(false)
        notify(
          "Há itens sem disponibilidade. Ajuste o carrinho para finalizar."
        )
        void navigate({ to: "/cart" })
        return
      case "order_pending": {
        resetAttempt(userId)
        const orderId = pendingOrderIdOf(error)
        if (orderId) goToOrder(orderId)
        else setIsAwaitingRetry(false)
        return
      }
      case "idempotency_conflict":
        restart("Revise o pedido e confirme novamente.")
        void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
        return
      case "wallet_not_connected":
        updateAttempt(userId, { isSent: false })
        setIsAwaitingRetry(false)
        notify(error.message)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.user.wallets(userId),
        })
        return
      default:
        if (error.status !== 401) notify(error.message)
        if (isRetry) return
        updateAttempt(userId, { isSent: false })
        setIsAwaitingRetry(false)
    }
  }

  const mutation = useMutation({
    mutationKey: ORDER_MUTATION_KEY,
    scope: { id: "cart" },
    retry: 0,
    mutationFn: ({ key, input }: SubmitVariables) => createOrder(input, key),
    onSuccess: handleSuccess,
    onError: handleError,
  })

  function isSending() {
    return queryClient.isMutating({ mutationKey: ORDER_MUTATION_KEY }) > 0
  }

  return {
    isAwaitingRetry,
    isPending: mutation.isPending,
    isSending,
    submit: (variables: SubmitVariables, onRejected: () => void) => {
      if (isSending()) return
      updateAttempt(userId, { isSent: true, input: variables.input })
      mutation.mutate(variables, {
        onError: (error) => {
          if (!(error instanceof ApiError) || error.code !== "quote_stale") {
            onRejected()
          }
        },
      })
    },
    retry: () => {
      if (isSending()) return

      const attempt = getAttempt(userId)
      if (!attempt?.input) {
        setIsAwaitingRetry(false)
        return
      }
      mutation.mutate({
        key: attempt.key,
        input: attempt.input,
        isRetry: true,
      })
    },
  }
}
