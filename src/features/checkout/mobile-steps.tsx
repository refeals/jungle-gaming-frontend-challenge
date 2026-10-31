import { useEffect, useRef, type ReactNode, type RefObject } from "react"

import { BackButton } from "@/components/back-button"

export const CHECKOUT_STEPS = ["details", "wallet", "review"] as const
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]

const STEP_TITLES: Record<CheckoutStep, string> = {
  details: "Seus dados",
  wallet: "Pagamento com carteira",
  review: "Revisão do pedido",
}

export function isCheckoutStep(value: unknown): value is CheckoutStep {
  return CHECKOUT_STEPS.includes(value as CheckoutStep)
}

export function MobileStepHeader({
  step,
  lastStepRef,
}: {
  step: CheckoutStep
  lastStepRef: RefObject<CheckoutStep>
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (lastStepRef.current !== step) headingRef.current?.focus()
    lastStepRef.current = step
  }, [lastStepRef, step])

  return (
    <div className="mb-4 flex min-h-11 items-center gap-6">
      <BackButton />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="min-w-0 text-[20px]/5 font-bold outline-none"
      >
        <span className="sr-only">
          Etapa {CHECKOUT_STEPS.indexOf(step) + 1} de {CHECKOUT_STEPS.length}
          :{" "}
        </span>
        {STEP_TITLES[step]}
      </h1>
    </div>
  )
}

export function StepSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[16px]/4 font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
