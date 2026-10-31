import { useSyncExternalStore } from "react"

import { queryClient } from "@/app/query-client"
import { queryKeys, type CartOwner } from "@/app/query-keys"
import type { Session } from "@/contracts"
import { useSession } from "@/features/auth/session"
import {
  getGuestCartId,
  subscribeToGuestCartId,
} from "@/features/cart/guest-cart-id"

function resolveOwner(
  session: Session | null | undefined,
  guestCartId: string | null
): CartOwner | null {
  if (session) return `user:${session.user.id}`
  if (session === null) return `guest:${guestCartId ?? "none"}`
  return null
}

export function useGuestCartId() {
  return useSyncExternalStore(subscribeToGuestCartId, getGuestCartId)
}

export function useCartOwner() {
  const { data: session } = useSession()
  return resolveOwner(session, useGuestCartId())
}

export function getCurrentCartOwner() {
  return resolveOwner(
    queryClient.getQueryData<Session | null>(queryKeys.session),
    getGuestCartId()
  )
}
