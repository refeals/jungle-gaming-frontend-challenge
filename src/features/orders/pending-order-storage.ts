const PENDING_ORDER_KEY = "kurio.pendingOrderId"

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

export function setPendingOrderId(orderId: string) {
  try {
    localStorage.setItem(PENDING_ORDER_KEY, orderId)
    notifyListeners()
  } catch (error) {
    console.error(error)
  }
}

export function clearPendingOrderId() {
  try {
    localStorage.removeItem(PENDING_ORDER_KEY)
    notifyListeners()
  } catch (error) {
    console.error(error)
  }
}
