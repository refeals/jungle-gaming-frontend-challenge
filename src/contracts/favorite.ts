import * as z from "zod/mini"

export const favoriteList = z.object({
  nftIds: z.array(z.string()),
})
