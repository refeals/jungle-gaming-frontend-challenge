import { now } from "@/mocks/db/clock"
import type { MockDb } from "@/mocks/db/schema"
import { fail } from "@/mocks/http/failure"

const BEARER_PREFIX = "Bearer "

function rejectSession(): never {
  fail(401, "session_invalid", "Sua sessão expirou. Entre novamente.")
}

export function readBearerToken(request: Request) {
  const header = request.headers.get("Authorization")
  return header?.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length)
    : null
}

export function optionalSession(db: MockDb, request: Request) {
  const token = readBearerToken(request)
  if (token === null) return null

  const session = db.sessions.find((candidate) => candidate.token === token)
  if (!session || new Date(session.expiresAt) <= now(db)) rejectSession()

  const user = db.users.find((candidate) => candidate.id === session.userId)
  if (!user) rejectSession()

  return { session, user }
}

export function requireSession(db: MockDb, request: Request) {
  return optionalSession(db, request) ?? rejectSession()
}

export function requireUser(db: MockDb, request: Request) {
  return requireSession(db, request).user
}

export function resolveCart(db: MockDb, request: Request) {
  const user = optionalSession(db, request)?.user ?? null

  if (user) {
    const cart = db.carts.find((candidate) => candidate.userId === user.id)
    return { user, cart: cart ?? null }
  }

  const guestCartId = request.headers.get("X-Cart-Id")
  const cart = db.carts.find(
    (candidate) => candidate.userId === null && candidate.id === guestCartId
  )
  return { user, cart: cart ?? null }
}
