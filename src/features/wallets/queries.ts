import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import {
  connectWallet,
  createWallet,
  disconnectWallet,
  getWallets,
  updateWallet,
} from "@/api/wallets"
import { staleTimes } from "@/app/query-client"
import { queryKeys } from "@/app/query-keys"
import type {
  ConnectWalletInput,
  Wallet,
  WalletConnection,
  WalletInput,
} from "@/contracts"

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
    onSuccess: async (saved) => {
      const queryKey = queryKeys.user.wallets(userId)
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData<Wallet[]>(
        queryKey,
        (wallets) =>
          wallets && [...wallets.filter(({ id }) => id !== saved.id), saved]
      )
    },
  })
}

function useApplyConnection(userId: string) {
  const queryClient = useQueryClient()

  return async (connection: WalletConnection) => {
    const queryKey = queryKeys.user.wallets(userId)
    await queryClient.cancelQueries({ queryKey })
    queryClient.setQueryData<Wallet[]>(queryKey, (wallets) =>
      wallets?.map((wallet) =>
        wallet.id === connection.walletId
          ? {
              ...wallet,
              status: connection.status,
              connectedNetwork: connection.network,
              connectedWalletType: connection.walletType,
            }
          : wallet
      )
    )
  }
}

export function useConnectWallet(userId: string) {
  return useMutation({
    scope: { id: "wallet-connection" },
    mutationFn: ({
      walletId,
      ...input
    }: ConnectWalletInput & { walletId: string }) =>
      connectWallet(walletId, input),
    onSuccess: useApplyConnection(userId),
  })
}

export function useDisconnectWallet(userId: string) {
  return useMutation({
    scope: { id: "wallet-connection" },
    mutationFn: disconnectWallet,
    onSuccess: useApplyConnection(userId),
  })
}
