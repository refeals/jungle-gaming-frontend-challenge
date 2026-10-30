import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { createWallet, getWallets, updateWallet } from "@/api/wallets"
import { staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type { Wallet, WalletInput } from "@/contracts"

export function walletsOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.user.wallets(userId),
    queryFn: ({ signal }) => getWallets(signal),
    staleTime: staleTimes.wallets,
  })
}

export function useSaveWallet(userId: string, wallet: Wallet | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WalletInput) =>
      wallet ? updateWallet(wallet.id, input) : createWallet(input),
    onSuccess: (saved) => {
      queryClient.setQueryData<Wallet[]>(
        queryKeys.user.wallets(userId),
        (wallets) => [
          ...(wallets ?? []).filter(({ id }) => id !== saved.id),
          saved,
        ]
      )
    },
  })
}
