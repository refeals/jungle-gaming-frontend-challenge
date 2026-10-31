const PENDING_ORDER_KEY = "kurio.pendingOrderId"

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
  } catch (error) {
    console.error(error)
  }
}

export function clearPendingOrderId() {
  try {
    localStorage.removeItem(PENDING_ORDER_KEY)
  } catch (error) {
    console.error(error)
  }
}
