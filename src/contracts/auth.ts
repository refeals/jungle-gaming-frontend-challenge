import * as z from "zod/mini"

import {
  email,
  isoDateTime,
  password,
  requiredSecret,
  requiredText,
} from "@/contracts/common"

export const user = z.object({
  id: z.string(),
  email,
  username: z.string(),
  displayName: z.string(),
  avatarDataUrl: z.nullable(z.string()),
})

export const session = z.object({
  user,
  expiresAt: isoDateTime,
})

export const authResult = z.extend(session, {
  token: z.string(),
})

export const loginInput = z.object({
  email,
  password: requiredSecret,
})

export const registerInput = z
  .object({
    username: requiredText,
    email,
    password,
    confirmPassword: z.string(),
  })
  .check(
    z.refine((input) => input.password === input.confirmPassword, {
      error: "As senhas não coincidem",
      path: ["confirmPassword"],
    })
  )
