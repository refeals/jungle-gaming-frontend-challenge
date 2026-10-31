export const DRAFT_PREFIX = "kurio.checkoutDraft."
export const ATTEMPT_PREFIX = "kurio.checkoutAttempt."

function clearByPrefix(
  storage: Storage,
  prefix: string,
  exceptUserId: string | undefined
) {
  Object.keys(storage)
    .filter(
      (key) => key.startsWith(prefix) && key !== `${prefix}${exceptUserId}`
    )
    .forEach((key) => storage.removeItem(key))
}

export function clearCheckoutStorage(exceptUserId?: string) {
  try {
    clearByPrefix(sessionStorage, DRAFT_PREFIX, exceptUserId)
    clearByPrefix(localStorage, ATTEMPT_PREFIX, exceptUserId)
  } catch (error) {
    console.error(error)
  }
}
