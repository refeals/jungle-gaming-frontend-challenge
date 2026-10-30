let expiredUserId: string | null = null

export function getExpiredUserId() {
  return expiredUserId
}

export function markSessionExpired(userId: string) {
  expiredUserId = userId
}

export function clearExpiredSession() {
  expiredUserId = null
}
