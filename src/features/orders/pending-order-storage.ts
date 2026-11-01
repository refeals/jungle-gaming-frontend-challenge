const PENDING_ORDER_KEY = "kurio.pendingOrderId"
const PENDING_ORDER_OWNER_KEY = "kurio.pendingOrderOwner"

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

export function subscribeToPendingOrderId(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function getPendingOrderId() {
  try {
    return localStorage.getItem(PENDING_ORDER_KEY)
  } catch {
    return null
  }
}

export function setPendingOrderId(orderId: string, userId: string) {
  try {
    localStorage.setItem(PENDING_ORDER_KEY, orderId)
    localStorage.setItem(PENDING_ORDER_OWNER_KEY, userId)
    notifyListeners()
  } catch (error) {
    console.error(error)
  }
}

export function clearPendingOrderId() {
  try {
    localStorage.removeItem(PENDING_ORDER_KEY)
    localStorage.removeItem(PENDING_ORDER_OWNER_KEY)
    notifyListeners()
  } catch (error) {
    console.error(error)
  }
}

export function discardForeignPendingOrder(userId: string) {
  try {
    const orderId = localStorage.getItem(PENDING_ORDER_KEY)
    if (!orderId) return null
    if (localStorage.getItem(PENDING_ORDER_OWNER_KEY) === userId) return null
    clearPendingOrderId()
    return orderId
  } catch {
    return null
  }
}
