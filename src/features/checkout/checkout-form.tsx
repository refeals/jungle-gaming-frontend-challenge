import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useMemo, useState } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import type { Cart, Profile, Wallet } from "@/contracts"
import { formatEth } from "@/features/cart/format"
import { readDraft, writeDraft } from "@/features/checkout/checkout-draft"
import {
  applyDraft,
  checkoutDetails,
  checkoutFormInput,
  connectedValues,
  DETAIL_FIELDS,
  findWallet,
  initialWalletValues,
  toDraft,
  toPrefill,
  type CheckoutValues,
} from "@/features/checkout/checkout-values"
import {
  CollectorFields,
  NetworkField,
  NoteField,
} from "@/features/checkout/collector-fields"
import {
  MobileStepHeader,
  StepSection,
  type CheckoutStep,
} from "@/features/checkout/mobile-steps"
import { OrderSummary } from "@/features/checkout/order-summary"
import {
  ConnectionStatus,
  useWalletConnection,
  WalletMenu,
} from "@/features/checkout/wallet-connection"
import {
  OtherWalletToggle,
  TypeOptions,
  WalletCards,
} from "@/features/checkout/wallet-selector"
import { notify } from "@/lib/notify"
import { useMediaQuery } from "@/lib/use-media-query"

const PRIMARY_ACTION =
  "flex h-[60px] w-full items-center justify-center rounded-[40px] bg-[linear-gradient(135deg,#d28a4c,rgb(210_138_76_/_0.8))] text-[15px]/4 font-bold text-primary-foreground aria-disabled:opacity-50 md:h-[45px] md:rounded-[6px] md:bg-primary md:bg-none"
const CHECKOUT_FORM_ID = "checkout-form"
const CONNECT_REASON = "Conecte a carteira para confirmar a compra."

type CheckoutFormProps = {
  userId: string
  cart: Cart
  profile: Profile
  wallets: Wallet[]
  step: CheckoutStep
}

export function CheckoutForm({
  userId,
  cart,
  profile,
  wallets,
  step,
}: CheckoutFormProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const navigate = useNavigate({ from: "/checkout" })
  const [draft] = useState(() => readDraft(userId))
  const [walletValues] = useState(() => initialWalletValues(wallets, draft))
  const prefill = useMemo(
    () => toPrefill(profile, wallets, walletValues),
    [profile, walletValues, wallets]
  )
  const initialValues = useMemo(
    () => applyDraft(prefill, draft),
    [draft, prefill]
  )
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutFormInput),
    mode: "onBlur",
    defaultValues: initialValues,
    values: initialValues,
    resetOptions: { keepDirtyValues: true },
  })
  const { control, getValues, handleSubmit, setValue, subscribe, trigger } =
    form

  const selectedSlot = useWatch({ control, name: "walletSlot" })
  const network = useWatch({ control, name: "network" })
  const walletType = useWatch({ control, name: "walletType" })
  const selected = findWallet(wallets, selectedSlot) ?? wallets[0]
  const connection = useWalletConnection(userId, selected, network, walletType)
  const isConnected = connection.state === "connected"

  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => writeDraft(userId, toDraft(values, prefill)),
      }),
    [prefill, subscribe, userId]
  )

  const redirectToPendingStep = useEffectEvent(() => {
    if (isDesktop || step === "details") return
    if (!checkoutDetails.safeParse(getValues()).success) {
      void navigate({
        search: (prev) => ({ ...prev, step: "details" }),
        replace: true,
      })
      return
    }
    if (step === "review" && !isConnected) {
      void navigate({
        search: (prev) => ({ ...prev, step: "wallet" }),
        replace: true,
      })
    }
  })

  useEffect(() => {
    redirectToPendingStep()
  }, [isDesktop, step])

  function selectType(next: Wallet["walletType"]) {
    setValue("walletType", next, { shouldDirty: true, shouldValidate: true })
    connection.connect({
      walletId: selected.id,
      network,
      walletType: next,
    })
  }

  function selectSlot(slot: Wallet["slot"]) {
    const wallet = findWallet(wallets, slot)
    if (!wallet) return

    const values = connectedValues(wallet)
    setValue("walletSlot", slot, { shouldDirty: true })
    setValue("network", values.network, { shouldDirty: true })
    setValue("walletType", values.walletType, { shouldDirty: true })
    connection.connect({
      walletId: wallet.id,
      network: values.network,
      walletType: values.walletType,
    })
  }

  async function continueToWallet() {
    const isValid = await trigger(DETAIL_FIELDS, { shouldFocus: true })
    if (isValid) {
      void navigate({ search: (prev) => ({ ...prev, step: "wallet" }) })
    }
  }

  function confirmPurchase() {
    if (!isConnected) {
      notify(CONNECT_REASON)
      return
    }
    void handleSubmit(() => {
      notify("A revisão do pedido chega em breve.")
    })()
  }

  const connectionStatus = (
    <ConnectionStatus
      state={connection.state}
      wallet={selected}
      network={network}
      walletType={walletType}
      onConnect={() => connection.connect()}
    />
  )

  const confirmAction = (
    <div>
      <button
        type="submit"
        form={CHECKOUT_FORM_ID}
        aria-disabled={!isConnected || undefined}
        className={PRIMARY_ACTION}
      >
        Confirmar compra
      </button>
      {!isConnected && (
        <p className="mt-2 text-center text-[13px]/4 text-brand-text">
          {CONNECT_REASON}
        </p>
      )}
    </div>
  )

  if (!isDesktop) {
    return (
      <FormProvider {...form}>
        <MobileStepHeader step={step === "review" ? "wallet" : step} />
        <form
          id={CHECKOUT_FORM_ID}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (step === "details") void continueToWallet()
            else confirmPurchase()
          }}
        >
          {step === "details" ? (
            <div className="flex flex-col gap-4">
              <CollectorFields
                address={selected.address}
                includesWallet={false}
              />
              <NoteField />
              <button type="submit" className={`${PRIMARY_ACTION} mt-4`}>
                Continuar
              </button>
            </div>
          ) : (
            <>
              <StepSection
                title="Carteira conectada"
                action={
                  <Link
                    to="/wallets"
                    search={{ redirect: "/checkout?step=wallet" }}
                    className="text-[14px]/4 font-bold text-brand-text"
                  >
                    Trocar carteira
                  </Link>
                }
              >
                <WalletCards
                  wallets={wallets}
                  value={selectedSlot}
                  onSelect={selectSlot}
                  onDisconnect={connection.disconnect}
                />
              </StepSection>
              <StepSection title="Carteira e rede">
                <div className="flex flex-col gap-4">
                  <NetworkField />
                  <TypeOptions
                    value={walletType}
                    onSelect={selectType}
                    hasMarks
                  />
                  {connectionStatus}
                </div>
              </StepSection>
              <p className="mb-6 flex justify-end gap-7 text-[16px]/4 font-bold">
                Total:
                <span className="text-[18px]/4 text-brand-text">
                  {formatEth(cart.summary.totalEth)}
                </span>
              </p>
              {confirmAction}
            </>
          )}
        </form>
      </FormProvider>
    )
  }

  return (
    <FormProvider {...form}>
      <Breadcrumbs
        items={[
          { label: "Início", to: "/" },
          { label: "Mercado", to: "/" },
          { label: "Pagamento" },
        ]}
      />
      <h1 className="sr-only">Pagamento</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,763fr)_minmax(0,405fr)]">
        <form
          id={CHECKOUT_FORM_ID}
          noValidate
          aria-labelledby="checkout-collector-title"
          onSubmit={(event) => {
            event.preventDefault()
            confirmPurchase()
          }}
        >
          <h2
            id="checkout-collector-title"
            className="mb-3 text-[17px]/4 font-bold"
          >
            Perfil do colecionador
          </h2>
          <CollectorFields
            address={selected.address}
            includesWallet
            onWalletTypeSelected={selectType}
          />
          <div className="mt-6 flex flex-col gap-6">
            <OtherWalletToggle
              wallets={wallets}
              selected={selected}
              onSelect={selectSlot}
            />
            <NoteField />
          </div>
        </form>
        <aside className="flex flex-col gap-4 lg:self-start">
          <OrderSummary
            lines={cart.items}
            values={cart.summary}
            couponCode={cart.couponCode}
          />
          <h2 className="mt-1 text-center text-[17px]/4 font-bold">
            Carteira e rede
          </h2>
          <TypeOptions
            value={walletType}
            onSelect={selectType}
            hasMarks={false}
          />
          <div className="flex items-center justify-between gap-2">
            {connectionStatus}
            <WalletMenu
              wallet={selected}
              onDisconnect={() => connection.disconnect(selected)}
            />
          </div>
          {confirmAction}
        </aside>
      </div>
    </FormProvider>
  )
}
