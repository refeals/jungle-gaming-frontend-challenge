import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"

import { getSession, login, logout, register } from "@/api/auth"
import { ApiError } from "@/api/errors"
import { staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type { AuthResult, Session } from "@/contracts"
import {
  clearExpiredSession,
  getExpiredUserId,
} from "@/features/auth/expired-session"
import { isPrivateRoute } from "@/features/auth/private-route"
import {
  PRIVATE_QUERY_KEYS,
  resetPrivateState,
} from "@/features/auth/session-reset"
import { getToken, setToken } from "@/features/auth/token-storage"
import {
  clearGuestCartId,
  getGuestCartId,
} from "@/features/cart/guest-cart-id"
import {
  mergeGuestCart,
  notifyMergeAdjustments,
} from "@/features/cart/guest-cart-merge"
import { notify } from "@/lib/notify"
import { joinSession } from "@/realtime/socket-session"

export const sessionOptions = queryOptions({
  queryKey: queryKeys.session,
  staleTime: staleTimes.session,
  initialData: (): Session | null | undefined =>
    getToken() ? undefined : null,
  queryFn: async ({ signal }): Promise<Session | null> => {
    if (!getToken()) return null

    try {
      return await getSession(signal)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
})

export function useSession() {
  return useQuery(sessionOptions)
}

function useStartSession() {
  const queryClient = useQueryClient()

  return async ({ token, ...session }: AuthResult) => {
    const previousUserId =
      getExpiredUserId() ??
      queryClient.getQueryData<Session | null>(queryKeys.session)?.user.id

    if (previousUserId && previousUserId !== session.user.id) {
      resetPrivateState()
      clearGuestCartId()
    }

    const guestCartId = getGuestCartId()
    const merged = guestCartId && (await mergeGuestCart(guestCartId, token))

    void queryClient.cancelQueries({ queryKey: queryKeys.session })
    void queryClient.cancelQueries({ queryKey: queryKeys.cart.all })
    queryClient.removeQueries({ queryKey: queryKeys.cart.all })
    clearExpiredSession()
    setToken(token)
    if (merged) {
      queryClient.setQueryData(
        queryKeys.cart.detail(`user:${session.user.id}`),
        merged.cart
      )
      clearGuestCartId()
      notifyMergeAdjustments(merged.adjustments)
    }
    queryClient.setQueryData(queryKeys.session, session)
    joinSession()

    if (previousUserId === session.user.id) {
      for (const queryKey of PRIVATE_QUERY_KEYS) {
        void queryClient.invalidateQueries({ queryKey })
      }
    }
  }
}

export function useLogin() {
  const startSession = useStartSession()

  return useMutation({
    mutationFn: login,
    gcTime: 0,
    onSuccess: async (result) => {
      await startSession(result)
      notify("Você entrou na sua conta.")
    },
  })
}

export function useRegister() {
  const startSession = useStartSession()

  return useMutation({
    mutationFn: register,
    gcTime: 0,
    onSuccess: async (result) => {
      await startSession(result)
      notify("Conta criada.")
    },
  })
}

export function useLogout() {
  const router = useRouter()

  return useMutation({
    mutationFn: () => logout().catch(() => undefined),
    onSettled: () => {
      resetPrivateState()
      clearGuestCartId()
      notify("Você saiu da sua conta.")

      if (isPrivateRoute(router)) {
        void router.navigate({ to: "/", replace: true })
      }
    },
  })
}
