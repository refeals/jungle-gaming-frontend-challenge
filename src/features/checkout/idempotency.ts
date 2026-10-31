import * as z from "zod/mini"

import { ATTEMPT_PREFIX } from "@/features/checkout/checkout-storage"
import { createOrderInput } from "@/contracts/order"

const checkoutAttempt = z.object({
  key: z.string(),
  quoteId: z.string(),
  userId: z.string(),
  isSent: z.boolean(),
  input: z.optional(createOrderInput),
  orderId: z.optional(z.string()),
})

export type CheckoutAttempt = z.infer<typeof checkoutAttempt>

function attemptKey(userId: string) {
  return `${ATTEMPT_PREFIX}${userId}`
}

function writeAttempt(attempt: CheckoutAttempt) {
  try {
    localStorage.setItem(attemptKey(attempt.userId), JSON.stringify(attempt))
  } catch (error) {
    console.error(error)
  }
  return attempt
}

export function getAttempt(userId: string) {
  try {
    const raw = localStorage.getItem(attemptKey(userId))
    if (!raw) return null
    const parsed = checkoutAttempt.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function getOrCreateAttempt(userId: string, quoteId: string) {
  const current = getAttempt(userId)
  if (current?.quoteId === quoteId && !current.orderId) return current

  return writeAttempt({
    key: crypto.randomUUID(),
    quoteId,
    userId,
    isSent: false,
  })
}

export function updateAttempt(
  userId: string,
  change: Partial<Omit<CheckoutAttempt, "key" | "userId">>
) {
  const current = getAttempt(userId)
  if (current) writeAttempt({ ...current, ...change })
}

export function resetAttempt(userId: string) {
  try {
    localStorage.removeItem(attemptKey(userId))
  } catch (error) {
    console.error(error)
  }
}

export function isUnconfirmed(attempt: CheckoutAttempt | null) {
  return Boolean(attempt?.isSent && attempt.input && !attempt.orderId)
}
