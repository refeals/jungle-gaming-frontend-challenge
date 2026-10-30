const DEFAULT_LIMIT = 200

export function createEventDedupe(limit = DEFAULT_LIMIT) {
  const seen = new Set<string>()

  return {
    isDuplicate(eventId: string) {
      if (seen.has(eventId)) return true

      seen.add(eventId)
      if (seen.size > limit) {
        const [oldest] = seen
        seen.delete(oldest)
      }
      return false
    },
  }
}
