import { zodResolver } from "@hookform/resolvers/zod"
import { Link, Navigate, useNavigate } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { ApiError } from "@/api/errors"
import { FormProvider, useForm, useWatch } from "react-hook-form"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import type {
  Cart,
  CreateOrderInput,
  Profile,
  Quote,
  Wallet,
} from "@/contracts"
import { ExpiredCouponNotice } from "@/features/cart/expired-coupon-notice"
import { formatEth } from "@/features/cart/format"
import { SummarySkeleton } from "@/features/checkout/checkout-skeleton"
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
import { getOrCreateAttempt } from "@/features/checkout/idempotency"
import { OrderSummary } from "@/features/checkout/order-summary"
import { hasSameValues, useQuote } from "@/features/checkout/quote-queries"
import { ReviewContent } from "@/features/checkout/review-content"
import { ReviewDialog } from "@/features/checkout/review-dialog"
import type { useSubmitOrder } from "@/features/checkout/use-submit-order"
import { setPendingOrderId } from "@/features/orders/pending-order-storage"
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
const QUOTE_REASON = "Valores mudaram. Atualize a cotação"
const UPDATING_REASON = "Atualizando a cotação..."
const QUOTE_FAILED_REASON = "A cotação não pôde ser atualizada."

function pendingOrderOf(error: unknown) {
  if (!(error instanceof ApiError) || error.code !== "order_pending") {
    return null
  }
  const { orderId } = (error.details ?? {}) as { orderId?: unknown }
  return typeof orderId === "string" ? orderId : null
}

function toCreateOrderInput(
  values: CheckoutValues,
  quote: Quote,
  wallet: Wallet
): CreateOrderInput {
  return {
    quoteId: quote.quoteId,
    walletId: wallet.id,
    collector: {
      displayName: values.displayName,
      username: values.username,
      email: values.email,
      profileName: values.profileName,
      ensName: values.ensName || null,
      secondaryAddress: values.secondaryAddress || null,
      referralCode: values.referralCode || null,
      note: values.note || null,
    },
  }
}

type CheckoutFormProps = {
  userId: string
  cart: Cart
  profile: Profile
  wallets: Wallet[]
  step: CheckoutStep
  isCartFetching: boolean
  isSessionActive: boolean
  order: ReturnType<typeof useSubmitOrder>
}

export function CheckoutForm({
  userId,
  cart,
  profile,
  wallets,
  step,
  isCartFetching,
  isSessionActive,
  order,
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
  const {
    quote,
    error: quoteError,
    isReady: isQuoteReady,
    retry: retryQuote,
  } = useQuote({
    userId,
    network,
    cart,
    isCartFetching,
    enabled: isSessionActive,
  })
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  const [isRenewed, setIsRenewed] = useState(false)
  const isReviewing = isDesktop ? isReviewOpen : step === "review"

  if (quote && isQuoteReady && isReviewing) {
    if (!reviewed) setReviewed(quote)
    else if (reviewed !== quote && hasSameValues(reviewed, quote)) {
      if (reviewed.quoteId !== quote.quoteId) setIsRenewed(true)
      setReviewed(quote)
    }
  }

  function getBlockedReason() {
    if (!isConnected) return CONNECT_REASON
    if (isQuoteReady) return null
    if (quoteError) return QUOTE_FAILED_REASON
    return quote && isReviewing ? QUOTE_REASON : UPDATING_REASON
  }

  const blockedReason = getBlockedReason()
  const lastStepRef = useRef(step)

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
  }, [isConnected, isDesktop, step])

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
    if (blockedReason) {
      notify(blockedReason)
      return
    }
    void handleSubmit(() => {
      setReviewed(quote ?? null)
      setIsRenewed(false)
      if (isDesktop) {
        setIsReviewOpen(true)
        return
      }
      void navigate({ search: (prev) => ({ ...prev, step: "review" }) })
    })()
  }

  function submitOrder() {
    if (blockedReason) {
      notify(blockedReason)
      return
    }
    if (!quote || order.isSending()) return

    const attempt = getOrCreateAttempt(userId, quote.quoteId)
    order.submit(
      {
        key: attempt.key,
        input: toCreateOrderInput(getValues(), quote, selected),
      },
      () => setIsReviewOpen(false)
    )
  }

  const pendingOrderId = pendingOrderOf(quoteError)
  const hasAvailabilityConflict =
    quoteError instanceof ApiError &&
    quoteError.code === "availability_conflict"

  useEffect(() => {
    if (pendingOrderId) setPendingOrderId(pendingOrderId)
  }, [pendingOrderId])

  useEffect(() => {
    if (hasAvailabilityConflict) {
      notify("Há itens sem disponibilidade. Ajuste o carrinho para finalizar.")
    }
  }, [hasAvailabilityConflict])

  if (pendingOrderId) {
    return (
      <Navigate
        to="/orders/$orderId"
        params={{ orderId: pendingOrderId }}
        replace
      />
    )
  }

  if (hasAvailabilityConflict) return <Navigate to="/cart" replace />

  const quoteFailure = quoteError && !isQuoteReady && (
    <p role="alert" className="text-[14px]/5 text-brand-text">
      Não foi possível atualizar a cotação.{" "}
      <button
        type="button"
        onClick={retryQuote}
        className="font-bold underline"
      >
        Tentar novamente
      </button>
    </p>
  )

  const reviewProps =
    quote && reviewed
      ? {
          quote,
          reviewed,
          wallet: selected,
          walletType,
          blockedReason,
          isPending: order.isPending,
          isRenewed,
          failure: quoteFailure,
          onConfirm: submitOrder,
          onAcceptChanges: () => {
            setIsRenewed(false)
            setReviewed(quote)
          },
        }
      : null

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
        aria-disabled={Boolean(blockedReason) || undefined}
        className={PRIMARY_ACTION}
      >
        Confirmar compra
      </button>
      {blockedReason && (
        <p className="mt-2 text-center text-[13px]/4 text-brand-text">
          {blockedReason}
        </p>
      )}
    </div>
  )

  if (!isDesktop && step === "review") {
    return (
      <>
        <MobileStepHeader step="review" lastStepRef={lastStepRef} />
        <ExpiredCouponNotice code={cart.expiredCouponCode} />
        {!reviewProps && quoteFailure}
        {reviewProps ? <ReviewContent {...reviewProps} /> : <SummarySkeleton />}
      </>
    )
  }

  if (!isDesktop) {
    return (
      <FormProvider {...form}>
        <MobileStepHeader step={step} lastStepRef={lastStepRef} />
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
                  {quote ? formatEth(quote.totalEth) : "..."}
                </span>
              </p>
              {quoteFailure}
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
          <ExpiredCouponNotice code={cart.expiredCouponCode} />
          {quote ? (
            <OrderSummary
              lines={quote.lines}
              values={quote}
              couponCode={cart.couponCode}
              isBusy={!isQuoteReady}
            />
          ) : (
            <SummarySkeleton />
          )}
          {quoteFailure}
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
      {reviewProps && (
        <ReviewDialog
          {...reviewProps}
          isOpen={isReviewOpen}
          isSending={order.isSending}
          onClose={() => setIsReviewOpen(false)}
        />
      )}
    </FormProvider>
  )
}
