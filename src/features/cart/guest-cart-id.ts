const GUEST_CART_KEY = "kurio.guestCartId"

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function handleStorage({ key }: StorageEvent) {
  if (key === GUEST_CART_KEY || key === null) notifyListeners()
}

export function getGuestCartId() {
  try {
    return localStorage.getItem(GUEST_CART_KEY)
  } catch {
    return null
  }
}

export function setGuestCartId(guestCartId: string) {
  try {
    localStorage.setItem(GUEST_CART_KEY, guestCartId)
  } catch (error) {
    console.error(error)
  }
  notifyListeners()
}

export function clearGuestCartId() {
  try {
    localStorage.removeItem(GUEST_CART_KEY)
  } catch (error) {
    console.error(error)
  }
  notifyListeners()
}

export function subscribeToGuestCartId(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage)
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage)
    }
  }
}
