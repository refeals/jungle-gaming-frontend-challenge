import * as z from "zod/mini"

import {
  email,
  password,
  requiredSecret,
  requiredText,
} from "@/contracts/common"

const MAX_AVATAR_DATA_URL_LENGTH = 700_000

export const profile = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email,
  ensName: z.nullable(z.string()),
  walletNickname: z.nullable(z.string()),
  avatarDataUrl: z.nullable(z.string()),
})

export const updateProfileInput = z.object({
  displayName: requiredText,
  username: requiredText,
  email,
  ensName: z.nullable(z.string()),
  walletNickname: z.nullable(z.string()),
})

export const changePasswordInput = z
  .object({
    currentPassword: requiredSecret,
    newPassword: password,
    confirmPassword: z.string(),
  })
  .check(
    z.refine((input) => input.newPassword === input.confirmPassword, {
      error: "As senhas não coincidem",
      path: ["confirmPassword"],
    })
  )

export const avatarInput = z.object({
  dataUrl: z
    .string()
    .check(
      z.regex(/^data:image\/(png|jpeg|webp);base64,/, "Imagem inválida"),
      z.maxLength(MAX_AVATAR_DATA_URL_LENGTH, "Imagem acima de 500 KB")
    ),
})
