import { useQuery } from "@tanstack/react-query"
import { useId, useState } from "react"

import type { Wallet } from "@/contracts"
import {
  AccountError,
  AccountFormSkeleton,
} from "@/features/account/account-states"
import { useAuthenticatedUser } from "@/features/auth/authenticated-user"
import { useSession } from "@/features/auth/session"
import { walletsOptions } from "@/features/wallets/queries"
import {
  toAccountValues,
  WalletForm,
  type WalletDraft,
} from "@/features/wallets/wallet-form"

const ADD_LINK = "text-[16px]/4 font-medium text-brand-text"
const SECTION_TITLE = "text-[17px]/4 font-bold"

function PrimarySection({
  userId,
  wallet,
}: {
  userId: string
  wallet: Wallet | undefined
}) {
  const formId = useId()

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <h1 className={SECTION_TITLE}>Carteira principal</h1>
        {!wallet && (
          <button
            type="button"
            onClick={() =>
              document.getElementById(formId)?.querySelector("input")?.focus()
            }
            className={ADD_LINK}
          >
            Adicionar
          </button>
        )}
      </div>
      <p className="mt-2 text-[14px]/4 text-muted-foreground">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs
        comprados.
      </p>
      <WalletForm
        key={wallet?.id ?? "new"}
        userId={userId}
        slot="primary"
        wallet={wallet}
        formId={formId}
      />
    </section>
  )
}

function SecondarySection({
  userId,
  wallet,
  primary,
}: {
  userId: string
  wallet: Wallet | undefined
  primary: Wallet | undefined
}) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSameAsPrimary, setIsSameAsPrimary] = useState(false)
  const [draft, setDraft] = useState<{
    version: number
    values?: WalletDraft
  }>({ version: 0 })
  const showForm = Boolean(wallet) || isFormOpen

  function handleSameAsPrimary(isChecked: boolean) {
    setIsSameAsPrimary(isChecked)
    setDraft(({ version }) => ({
      version: version + 1,
      values: isChecked && primary ? toAccountValues(primary) : undefined,
    }))
    if (isChecked) setIsFormOpen(true)
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className={SECTION_TITLE}>Carteira secundária</h2>
        {!wallet && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-[14px]/4 has-disabled:opacity-50">
              <input
                type="checkbox"
                disabled={!primary}
                checked={isSameAsPrimary}
                onChange={(event) => handleSameAsPrimary(event.target.checked)}
                className="size-4 accent-primary"
              />
              Igual à carteira principal
            </label>
            {!showForm && (
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className={ADD_LINK}
              >
                Adicionar
              </button>
            )}
          </div>
        )}
      </div>
      {showForm ? (
        <WalletForm
          key={`${wallet?.id ?? "new"}-${draft.version}`}
          userId={userId}
          slot="secondary"
          wallet={wallet}
          initialValues={draft.values}
          onSaved={() => {
            setIsSameAsPrimary(false)
            setDraft(({ version }) => ({ version: version + 1 }))
          }}
        />
      ) : (
        <p className="mt-3 text-[14px]/4 text-muted-foreground">
          Você ainda não adicionou uma carteira secundária.
        </p>
      )}
    </section>
  )
}

export function WalletsPage() {
  const user = useAuthenticatedUser()
  const { data: session } = useSession()
  const {
    data: wallets,
    isError,
    refetch,
  } = useQuery({
    ...walletsOptions(user.id),
    enabled: Boolean(session),
  })

  if (!wallets && isError) {
    return (
      <AccountError
        title="Não foi possível carregar suas carteiras"
        onRetry={() => void refetch()}
      />
    )
  }

  if (!wallets) return <AccountFormSkeleton />

  const primary = wallets.find((wallet) => wallet.slot === "primary")
  const secondary = wallets.find((wallet) => wallet.slot === "secondary")

  return (
    <>
      <PrimarySection userId={user.id} wallet={primary} />
      <SecondarySection userId={user.id} wallet={secondary} primary={primary} />
    </>
  )
}
