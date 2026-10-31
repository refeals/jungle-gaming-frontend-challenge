import { MoreVerticalIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Network, Wallet } from "@/contracts"
import { networkItems, walletTypeItems } from "@/features/wallets/wallet-fields"
import {
  useConnectWallet,
  useDisconnectWallet,
} from "@/features/wallets/queries"
import { notify } from "@/lib/notify"

export type ConnectionState =
  | "connected"
  | "connecting"
  | "rejected"
  | "failed"
  | "outdated"
  | "disconnected"

type ConnectionTarget = {
  walletId: string
  network: Network
  walletType: Wallet["walletType"]
}

export function walletTypeLabel(type: Wallet["walletType"]) {
  return walletTypeItems.find(({ value }) => value === type)?.label ?? type
}

export function networkLabel(network: Network) {
  return networkItems.find(({ value }) => value === network)?.label ?? network
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function useWalletConnection(
  userId: string,
  wallet: Wallet,
  network: Network,
  walletType: Wallet["walletType"]
) {
  const connectWallet = useConnectWallet(userId)
  const disconnectWallet = useDisconnectWallet(userId)
  const isSameTarget =
    wallet.connectedNetwork === network &&
    wallet.connectedWalletType === walletType

  function getState(): ConnectionState {
    if (connectWallet.isPending || disconnectWallet.isPending) {
      return "connecting"
    }
    if (wallet.status === "connected" && isSameTarget) return "connected"
    if (connectWallet.isError) return "failed"
    if (wallet.status === "rejected") return "rejected"
    return wallet.status === "connected" ? "outdated" : "disconnected"
  }

  return {
    state: getState(),
    connect: (
      target: ConnectionTarget = {
        walletId: wallet.id,
        network,
        walletType,
      }
    ) => connectWallet.mutate(target),
    disconnect: (target: Wallet) => {
      if (target.status !== "connected") {
        notify("Esta carteira já está desconectada.")
        return
      }
      connectWallet.reset()
      disconnectWallet.mutate(target.id, {
        onError: () => notify("Não foi possível desconectar a carteira."),
      })
    },
  }
}

const STATE_MESSAGES: Record<
  ConnectionState,
  (wallet: Wallet, network: Network, type: Wallet["walletType"]) => string
> = {
  connected: (_, network, type) =>
    `Conectada: ${walletTypeLabel(type)} na rede ${networkLabel(network)}.`,
  connecting: () => "Conectando a carteira...",
  rejected: () => "A carteira recusou a conexão.",
  failed: () => "Não foi possível conectar. Tente novamente.",
  outdated: () => "A rede ou o tipo mudou. Conecte a carteira novamente.",
  disconnected: () => "Carteira desconectada.",
}

const ACTION_LABELS: Partial<Record<ConnectionState, string>> = {
  rejected: "Tentar novamente",
  failed: "Tentar novamente",
  outdated: "Conectar carteira",
  disconnected: "Conectar carteira",
}

export function WalletMenu({
  wallet,
  onDisconnect,
}: {
  wallet: Wallet
  onDisconnect: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Opções de ${wallet.nickname}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MoreVerticalIcon className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onDisconnect}>Desconectar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ConnectionStatus({
  state,
  wallet,
  network,
  walletType,
  onConnect,
}: {
  state: ConnectionState
  wallet: Wallet
  network: Network
  walletType: Wallet["walletType"]
  onConnect: () => void
}) {
  const action = ACTION_LABELS[state]

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]/5">
      <p role="status" className="min-w-0 text-muted-foreground">
        {STATE_MESSAGES[state](wallet, network, walletType)}
      </p>
      {action && (
        <button
          type="button"
          onClick={onConnect}
          className="font-bold text-brand-text underline"
        >
          {action}
        </button>
      )}
    </div>
  )
}
