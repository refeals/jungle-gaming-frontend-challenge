import { mergeCart } from "@/api/cart"
import type { MergeResult } from "@/contracts"
import { notify } from "@/lib/notify"

let failedGuestCartId: string | null = null
let inFlight: {
  guestCartId: string
  result: Promise<MergeResult | null>
} | null = null

export function hasMergeFailed(guestCartId: string) {
  return failedGuestCartId === guestCartId
}

export function mergeGuestCart(guestCartId: string, token?: string) {
  if (inFlight?.guestCartId === guestCartId) return inFlight.result

  const result = mergeCart(guestCartId, token)
    .catch((error: unknown) => {
      console.error(error)
      failedGuestCartId = guestCartId
      notify(
        "Não foi possível trazer os itens do seu carrinho de visitante. Tentaremos de novo quando você voltar."
      )
      return null
    })
    .finally(() => {
      inFlight = null
    })
  inFlight = { guestCartId, result }

  return result
}

export function notifyMergeAdjustments(
  adjustments: MergeResult["adjustments"]
) {
  for (const { name, appliedQuantity } of adjustments) {
    notify(
      appliedQuantity === 0
        ? `${name} esgotou e saiu do carrinho.`
        : `Ajustamos a quantidade de ${name} para ${appliedQuantity}.`
    )
  }
}
