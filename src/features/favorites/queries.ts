import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError } from "@/api/errors"
import { addFavorite, getFavorites, removeFavorite } from "@/api/favorites"
import { queryClient as appQueryClient, staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import { useSession } from "@/features/auth/session"
import { notify } from "@/lib/notify"

const FAVORITE_MUTATION_KEY = ["favorite"] as const

export const FAVORITE_ERROR_MESSAGE =
  "Não foi possível atualizar seus favoritos"

export function favoriteMutationKey(nftId: string) {
  return [...FAVORITE_MUTATION_KEY, nftId] as const
}

function withFavorite(nftIds: string[], nftId: string, isFavorite: boolean) {
  const others = nftIds.filter((id) => id !== nftId)
  return isFavorite ? [...others, nftId] : others
}

type ToggleFavorite = {
  userId: string
  wasFavorite: boolean
}

function withPendingFavorites(userId: string, nftIds: string[]) {
  return appQueryClient
    .getMutationCache()
    .findAll({ mutationKey: FAVORITE_MUTATION_KEY, status: "pending" })
    .reduce((ids, { state, options }) => {
      const variables = state.variables as ToggleFavorite | undefined
      const nftId = options.mutationKey?.[1]
      if (variables?.userId !== userId || typeof nftId !== "string") return ids
      return withFavorite(ids, nftId, !variables.wasFavorite)
    }, nftIds)
}

export function favoritesOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.user.favorites(userId),
    queryFn: async ({ signal }) =>
      withPendingFavorites(userId, await getFavorites(signal)),
    staleTime: staleTimes.favorites,
  })
}

export function useFavoriteIds() {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery({
    ...favoritesOptions(userId ?? ""),
    enabled: Boolean(userId),
    refetchOnMount: false,
  })
}

export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient()

  function setFavorite(userId: string, isFavorite: boolean) {
    queryClient.setQueryData<string[]>(
      queryKeys.user.favorites(userId),
      (nftIds) => nftIds && withFavorite(nftIds, nftId, isFavorite)
    )
  }

  return useMutation({
    mutationKey: favoriteMutationKey(nftId),
    mutationFn: ({ wasFavorite }: ToggleFavorite) =>
      wasFavorite ? removeFavorite(nftId) : addFavorite(nftId),
    onMutate: async ({ userId, wasFavorite }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.user.favorites(userId),
      })
      setFavorite(userId, !wasFavorite)
    },
    onError: (error, { userId, wasFavorite }) => {
      setFavorite(userId, wasFavorite)
      if (error instanceof ApiError && error.status === 401) return
      notify(FAVORITE_ERROR_MESSAGE)
    },
    onSettled: (_data, _error, { userId }) => {
      const inFlight = queryClient.isMutating({
        mutationKey: FAVORITE_MUTATION_KEY,
      })
      if (inFlight === 1) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.user.favorites(userId),
        })
      }
    },
  })
}
