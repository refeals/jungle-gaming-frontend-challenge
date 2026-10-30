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
import { resetPrivateState } from "@/features/auth/session-reset"
import { getToken, setToken } from "@/features/auth/token-storage"
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

  return ({ token, ...session }: AuthResult) => {
    const previousUserId =
      getExpiredUserId() ??
      queryClient.getQueryData<Session | null>(queryKeys.session)?.user.id

    if (previousUserId && previousUserId !== session.user.id) {
      resetPrivateState()
    }

    void queryClient.cancelQueries({ queryKey: queryKeys.session })
    clearExpiredSession()
    setToken(token)
    queryClient.setQueryData(queryKeys.session, session)
    joinSession()

    if (previousUserId === session.user.id) {
      for (const queryKey of [
        queryKeys.user.all,
        queryKeys.cart,
        queryKeys.quote,
      ]) {
        void queryClient.invalidateQueries({ queryKey })
      }
    }
  }
}

export function useLogin() {
  const startSession = useStartSession()

  return useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      startSession(result)
      notify("Você entrou na sua conta.")
    },
  })
}

export function useRegister() {
  const startSession = useStartSession()

  return useMutation({
    mutationFn: register,
    onSuccess: (result) => {
      startSession(result)
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
      notify("Você saiu da sua conta.")

      if (isPrivateRoute(router)) {
        void router.navigate({ to: "/", replace: true })
      }
    },
  })
}
