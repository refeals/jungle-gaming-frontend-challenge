import { http } from "msw"

import { authResult, loginInput, registerInput, session } from "@/contracts"
import { createSalt, hashPassword, verifyPassword } from "@/mocks/db/password"
import { readDb, updateDb } from "@/mocks/db/store"
import { requireSession } from "@/mocks/http/auth"
import { fail, noContent, ok, readBody, route } from "@/mocks/http/respond"
import { nextId } from "@/mocks/services/ids"
import { createSession } from "@/mocks/services/sessions"

export const authHandlers = [
  http.post(
    "/api/auth/register",
    route(async ({ request }) => {
      const input = await readBody(request, registerInput)
      const salt = createSalt()
      const passwordHash = await hashPassword(input.password, salt)
      const email = input.email.toLowerCase()

      const result = updateDb((db) => {
        if (db.users.some((user) => user.email === email)) {
          fail(409, "email_taken", "Este e-mail já está cadastrado.", {
            fields: { email: "Este e-mail já está cadastrado." },
          })
        }

        const user = {
          id: nextId(db, "user"),
          email,
          username: input.username,
          displayName: input.username,
          ensName: null,
          walletNickname: null,
          avatarDataUrl: null,
          passwordHash,
          salt,
        }
        db.users.push(user)
        const { token, expiresAt } = createSession(db, user.id)
        return { token, expiresAt, user }
      })

      return ok(authResult, result, { status: 201 })
    })
  ),

  http.post(
    "/api/auth/login",
    route(async ({ request }) => {
      const input = await readBody(request, loginInput)
      const email = input.email.toLowerCase()
      const user = readDb().users.find((item) => item.email === email)
      const isValid =
        user !== undefined &&
        (await verifyPassword(input.password, user.salt, user.passwordHash))

      if (!isValid) {
        fail(401, "invalid_credentials", "E-mail ou senha incorretos.")
      }

      const result = updateDb((db) => {
        const { token, expiresAt } = createSession(db, user.id)
        return { token, expiresAt, user }
      })

      return ok(authResult, result)
    })
  ),

  http.post(
    "/api/auth/logout",
    route(({ request }) => {
      updateDb((db) => {
        const { session: current } = requireSession(db, request)
        db.sessions = db.sessions.filter((item) => item.token !== current.token)
      })
      return noContent()
    })
  ),

  http.get(
    "/api/session",
    route(({ request }) => {
      const { session: current, user } = requireSession(readDb(), request)
      return ok(session, { user, expiresAt: current.expiresAt })
    })
  ),
]
