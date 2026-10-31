import {
  keepPreviousData,
  useIsMutating,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { createQuote } from "@/api/quotes"
import { staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type { Cart, Network, Quote } from "@/contracts"

export const ORDER_MUTATION_KEY = ["order"] as const
const CART_MUTATION_KEY = ["cart"] as const

function signatureOf(
  lines: {
    nftId: string
    editionId: string
    unitPriceEth: string
    quantity: number
  }[],
  couponCode: string | null
) {
  return JSON.stringify([
    lines.map((line) => [
      line.nftId,
      line.editionId,
      line.unitPriceEth,
      line.quantity,
    ]),
    couponCode,
  ])
}

type UseQuoteOptions = {
  userId: string
  network: Network
  cart: Cart
  isCartFetching: boolean
  enabled: boolean
}

export function useQuote({
  userId,
  network,
  cart,
  isCartFetching,
  enabled,
}: UseQuoteOptions) {
  const queryClient = useQueryClient()
  const isOrderBusy = useIsMutating({ mutationKey: ORDER_MUTATION_KEY }) > 0
  const isCartBusy = useIsMutating({ mutationKey: CART_MUTATION_KEY }) > 0
  const cartSignature = signatureOf(cart.items, cart.couponCode)

  const query = useQuery({
    queryKey: queryKeys.quote.detail(userId, network, cartSignature),
    queryFn: ({ signal }) => createQuote({ network }, signal),
    staleTime: staleTimes.quote,
    gcTime: 0,
    enabled: enabled && !isOrderBusy,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
  })
  const quote = query.data
  const isSettled = !query.isFetching && !isCartBusy
  const isMismatched =
    quote !== undefined &&
    !query.isPlaceholderData &&
    signatureOf(quote.lines, quote.couponCode) !== cartSignature
  const reconciledAt = useRef(0)

  useEffect(() => {
    if (
      !isMismatched ||
      !isSettled ||
      isCartFetching ||
      reconciledAt.current === query.dataUpdatedAt
    ) {
      return
    }
    reconciledAt.current = query.dataUpdatedAt
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  }, [
    isCartFetching,
    isMismatched,
    isSettled,
    query.dataUpdatedAt,
    queryClient,
  ])

  const quoteId = quote?.quoteId
  const validForMs = quote
    ? Date.parse(quote.expiresAt) - Date.parse(quote.issuedAt)
    : null

  useEffect(() => {
    if (!quoteId || validForMs === null) return

    const timer = setTimeout(() => {
      if (queryClient.isMutating({ mutationKey: ORDER_MUTATION_KEY }) > 0) {
        return
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
    }, validForMs)
    return () => clearTimeout(timer)
  }, [queryClient, quoteId, validForMs])

  return {
    quote,
    error: query.error,
    isReady:
      quote !== undefined &&
      !query.isError &&
      !query.isPlaceholderData &&
      !isMismatched &&
      isSettled,
    retry: () => void query.refetch(),
  }
}

export function hasSameValues(previous: Quote, current: Quote) {
  return (
    signatureOf(previous.lines, previous.couponCode) ===
      signatureOf(current.lines, current.couponCode) &&
    previous.network === current.network &&
    previous.subtotalEth === current.subtotalEth &&
    previous.discountEth === current.discountEth &&
    previous.feeEth === current.feeEth &&
    previous.totalEth === current.totalEth
  )
}
