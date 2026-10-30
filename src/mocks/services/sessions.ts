import { now } from "@/mocks/db/clock"
import type { MockDb } from "@/mocks/db/schema"

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export function createSession(db: MockDb, userId: string) {
  const session = {
    token: crypto.randomUUID(),
    userId,
    expiresAt: new Date(now(db).getTime() + SESSION_TTL_MS).toISOString(),
  }
  db.sessions.push(session)
  return session
}
