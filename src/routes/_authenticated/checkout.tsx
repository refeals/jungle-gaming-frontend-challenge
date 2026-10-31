import { createFileRoute } from "@tanstack/react-router"

import { CheckoutPage } from "@/features/checkout/checkout-page"
import {
  isCheckoutStep,
  type CheckoutStep,
} from "@/features/checkout/mobile-steps"

function CheckoutRoute() {
  const { step } = Route.useSearch()
  return <CheckoutPage step={step ?? "details"} />
}

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (search: Record<string, unknown>): { step?: CheckoutStep } => ({
    step: isCheckoutStep(search.step) ? search.step : undefined,
  }),
  component: CheckoutRoute,
})
