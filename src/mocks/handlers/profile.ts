import { http } from "msw"

import {
  avatarInput,
  changePasswordInput,
  profile,
  updateProfileInput,
} from "@/contracts"
import { createSalt, hashPassword, verifyPassword } from "@/mocks/db/password"
import type { MockDb } from "@/mocks/db/schema"
import { readDb, updateDb } from "@/mocks/db/store"
import { requireUser } from "@/mocks/http/auth"
import { fail, noContent, ok, readBody, route } from "@/mocks/http/respond"

function findUserById(db: MockDb, userId: string) {
  return (
    db.users.find((user) => user.id === userId) ??
    fail(401, "session_invalid", "Sua sessão expirou. Entre novamente.")
  )
}

export const profileHandlers = [
  http.get(
    "/api/profile",
    route(({ request }) => ok(profile, requireUser(readDb(), request)))
  ),

  http.patch(
    "/api/profile",
    route(async ({ request }) => {
      const input = await readBody(request, updateProfileInput)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const email = input.email.toLowerCase()
        const isTaken = db.users.some(
          (other) => other.id !== user.id && other.email === email
        )
        if (isTaken) {
          fail(409, "email_taken", "Este e-mail já está cadastrado.", {
            fields: { email: "Este e-mail já está cadastrado." },
          })
        }
        Object.assign(user, input, { email })
        return user
      })
      return ok(profile, result)
    })
  ),

  http.put(
    "/api/profile/avatar",
    route(async ({ request }) => {
      const input = await readBody(request, avatarInput)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        user.avatarDataUrl = input.dataUrl
        return user
      })
      return ok(profile, result)
    })
  ),

  http.delete(
    "/api/profile/avatar",
    route(({ request }) => {
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        user.avatarDataUrl = null
        return user
      })
      return ok(profile, result)
    })
  ),

  http.post(
    "/api/profile/password",
    route(async ({ request }) => {
      const input = await readBody(request, changePasswordInput)
      const user = requireUser(readDb(), request)
      const isCurrent = await verifyPassword(
        input.currentPassword,
        user.salt,
        user.passwordHash
      )
      if (!isCurrent) {
        fail(422, "validation_error", "Verifique os campos informados.", {
          fields: { currentPassword: "Senha atual incorreta." },
        })
      }

      const salt = createSalt()
      const passwordHash = await hashPassword(input.newPassword, salt)
      updateDb((db) => {
        Object.assign(findUserById(db, user.id), { salt, passwordHash })
      })
      return noContent()
    })
  ),
]
