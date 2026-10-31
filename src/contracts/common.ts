import * as z from "zod/mini"

z.config({
  customError: (issue) =>
    issue.input === undefined ? "Campo obrigatório" : "Valor inválido",
})

export const ethAmount = z
  .string()
  .check(z.regex(/^\d+(\.\d{1,18})?$/, "Valor em ETH inválido"))

export const ethAddress = z
  .string()
  .check(z.regex(/^0x[0-9a-fA-F]{40}$/, "Endereço 0x inválido"))

export const ensName = z
  .string()
  .check(z.regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen"))

export const requiredEnsName = z
  .string()
  .check(
    z.minLength(1, "Campo obrigatório"),
    z.regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen")
  )

export const addressOrEns = z
  .string()
  .check(
    z.regex(
      /^(0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)$/,
      "Informe um endereço 0x ou um nome .eth"
    )
  )

export const isoDateTime = z.iso.datetime()

export const email = z.email("E-mail inválido")

export const requiredText = z
  .string()
  .check(z.trim(), z.minLength(1, "Campo obrigatório"))

export const requiredSecret = z
  .string()
  .check(z.minLength(1, "Campo obrigatório"))

export const password = z
  .string()
  .check(z.minLength(8, "Use ao menos 8 caracteres"))

export const positiveQuantity = z.number().check(z.int(), z.gte(1))

export const network = z.enum(["ethereum", "polygon", "solana"])

export const nftCategory = z.enum([
  "digital-art",
  "photography",
  "music",
  "3d-art",
  "collectibles",
  "generative",
  "gaming",
  "subscriptions",
  "utility",
])

export const apiErrorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.optional(z.record(z.string(), z.string())),
    details: z.optional(z.unknown()),
  }),
})

export function paginated<Item extends z.ZodMiniType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  })
}
