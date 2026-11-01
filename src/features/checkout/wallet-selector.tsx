import { Link } from "@tanstack/react-router"
import { WalletIcon } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Wallet } from "@/contracts"
import { walletSlot, walletType as walletTypeSchema } from "@/contracts/wallet"
import type { CheckoutValues } from "@/features/checkout/checkout-values"
import { WalletMenu } from "@/features/checkout/wallet-connection"
import {
  networkLabel,
  shortAddress,
  walletTypeLabel,
} from "@/features/wallets/labels"
import { cn } from "@/lib/utils"

const WALLET_TYPES: Wallet["walletType"][] = [
  "walletconnect",
  "metamask",
  "coinbase",
]
const RADIO =
  "size-4 border-2 border-primary bg-transparent! data-checked:bg-transparent! [&_span_span]:bg-primary"

export function TypeOptions({
  value,
  onSelect,
  hasMarks,
}: {
  value: Wallet["walletType"]
  onSelect: (value: Wallet["walletType"]) => void
  hasMarks: boolean
}) {
  return (
    <RadioGroup
      aria-label="Tipo de carteira"
      value={value}
      onValueChange={(next) => onSelect(walletTypeSchema.parse(next))}
      className="gap-4"
    >
      {WALLET_TYPES.map((type) => (
        <label
          key={type}
          className={cn(
            "flex cursor-pointer items-center gap-4 text-[14px]/4 md:h-[45px] md:rounded-[3px] md:border md:border-primary/40 md:px-3 md:text-[15px]/5 md:has-data-checked:border-primary",
            "h-[65px] rounded-[15px] bg-card px-5 md:bg-transparent"
          )}
        >
          {hasMarks && (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[14px]/4 font-bold text-brand-text"
            >
              {type === "coinbase" ? (
                <WalletIcon className="size-5" />
              ) : (
                walletTypeLabel(type)[0]
              )}
            </span>
          )}
          <RadioGroupItem
            value={type}
            className={cn(RADIO, hasMarks && "order-last ml-auto")}
          />
          {walletTypeLabel(type)}
        </label>
      ))}
    </RadioGroup>
  )
}

export function WalletCards({
  wallets,
  value,
  onSelect,
  onDisconnect,
}: {
  wallets: Wallet[]
  value: Wallet["slot"]
  onSelect: (slot: Wallet["slot"]) => void
  onDisconnect: (wallet: Wallet) => void
}) {
  return (
    <RadioGroup
      aria-label="Carteira"
      value={value}
      onValueChange={(next) => onSelect(walletSlot.parse(next))}
      className="gap-5"
    >
      {wallets.map((wallet) => (
        <div
          key={wallet.id}
          className="flex min-h-[93px] items-center gap-5 rounded-[14px] bg-card py-3 pr-3 pl-5"
        >
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-5">
            <RadioGroupItem value={wallet.slot} className={RADIO} />
            <span className="min-w-0">
              <span className="block truncate text-[16px]/4 font-bold">
                {wallet.nickname}
              </span>
              <span className="mt-2 block text-[14px]/[22px] text-subtle-foreground">
                {shortAddress(wallet.address)}
                <br />
                Rede {networkLabel(wallet.connectedNetwork ?? wallet.network)}
              </span>
            </span>
          </label>
          <WalletMenu
            wallet={wallet}
            onDisconnect={() => onDisconnect(wallet)}
          />
        </div>
      ))}
    </RadioGroup>
  )
}

export function OtherWalletToggle({
  wallets,
  selected,
  onSelect,
}: {
  wallets: Wallet[]
  selected: Wallet
  onSelect: (slot: Wallet["slot"]) => void
}) {
  const { control } = useFormContext<CheckoutValues>()
  const isSecondary = useWatch({ control, name: "walletSlot" }) === "secondary"

  if (wallets.length < 2) {
    return (
      <Link
        to="/wallets"
        search={{ returnTo: "/checkout" }}
        className="block text-[15px]/5 text-brand-text underline"
      >
        Cadastrar outra carteira
      </Link>
    )
  }

  return (
    <label className="flex cursor-pointer flex-wrap items-center gap-x-2 text-[15px]/5">
      <input
        type="checkbox"
        checked={isSecondary}
        onChange={(event) =>
          onSelect(event.target.checked ? "secondary" : "primary")
        }
        className="size-4 appearance-none rounded-full border-2 border-primary outline-none checked:bg-primary checked:shadow-[inset_0_0_0_2px_var(--background)] focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      Usar outra carteira?
      <span className="text-[14px]/5 text-muted-foreground">
        Selecionada: {selected.nickname}
      </span>
    </label>
  )
}
