import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import {
  changePassword,
  getProfile,
  removeAvatar,
  updateAvatar,
  updateProfile,
} from "@/api/profile"
import { staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type { Profile } from "@/contracts"

export function profileOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.user.profile(userId),
    queryFn: ({ signal }) => getProfile(signal),
    staleTime: staleTimes.profile,
  })
}

function useApplyProfile(userId: string) {
  const queryClient = useQueryClient()

  return (profile: Profile) => {
    queryClient.setQueryData<Profile>(
      queryKeys.user.profile(userId),
      (current) => current && profile
    )
    void queryClient.invalidateQueries({ queryKey: queryKeys.session })
  }
}

export function useUpdateProfile(userId: string) {
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: useApplyProfile(userId),
  })
}

export function useUpdateAvatar(userId: string) {
  return useMutation({
    mutationFn: updateAvatar,
    onSuccess: useApplyProfile(userId),
  })
}

export function useRemoveAvatar(userId: string) {
  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: useApplyProfile(userId),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword, gcTime: 0 })
}
