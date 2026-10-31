export const DRAFT_PREFIX = "kurio.checkoutDraft."
export const ATTEMPT_PREFIX = "kurio.checkoutAttempt."

function clearByPrefix(storage: Storage, prefix: string) {
  Object.keys(storage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => storage.removeItem(key))
}

export function clearCheckoutStorage() {
  try {
    clearByPrefix(sessionStorage, DRAFT_PREFIX)
    clearByPrefix(localStorage, ATTEMPT_PREFIX)
  } catch (error) {
    console.error(error)
  }
}
