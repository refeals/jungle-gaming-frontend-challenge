const DRAFT_PREFIX = "kurio.checkoutDraft."

function draftKey(userId: string) {
  return `${DRAFT_PREFIX}${userId}`
}

export function readDraft(userId: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(draftKey(userId)) ?? "{}"
    )
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export function writeDraft(userId: string, draft: Record<string, string>) {
  try {
    sessionStorage.setItem(draftKey(userId), JSON.stringify(draft))
  } catch (error) {
    console.error(error)
  }
}

export function clearDraft(userId: string) {
  try {
    sessionStorage.removeItem(draftKey(userId))
  } catch (error) {
    console.error(error)
  }
}

export function clearCheckoutDrafts() {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(DRAFT_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key))
  } catch (error) {
    console.error(error)
  }
}
