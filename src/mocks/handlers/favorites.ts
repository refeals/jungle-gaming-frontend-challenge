import { http } from "msw"

import { favoriteList } from "@/contracts"
import type { MockDb } from "@/mocks/db/schema"
import { readDb, updateDb } from "@/mocks/db/store"
import { requireUser } from "@/mocks/http/auth"
import { ok, pathParam, route } from "@/mocks/http/respond"
import { findNft } from "@/mocks/services/nfts"

function toFavoriteList(db: MockDb, userId: string) {
  return {
    nftIds: db.favorites
      .filter((favorite) => favorite.userId === userId)
      .map((favorite) => favorite.nftId),
  }
}

export const favoriteHandlers = [
  http.get(
    "/api/favorites",
    route(({ request }) => {
      const db = readDb()
      return ok(favoriteList, toFavoriteList(db, requireUser(db, request).id))
    })
  ),

  http.put(
    "/api/favorites/:nftId",
    route(({ request, params }) => {
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const nftId = findNft(db, pathParam(params, "nftId")).id
        const exists = db.favorites.some(
          (favorite) => favorite.userId === user.id && favorite.nftId === nftId
        )
        if (!exists) db.favorites.push({ userId: user.id, nftId })
        return toFavoriteList(db, user.id)
      })
      return ok(favoriteList, result)
    })
  ),

  http.delete(
    "/api/favorites/:nftId",
    route(({ request, params }) => {
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const nftId = pathParam(params, "nftId")
        db.favorites = db.favorites.filter(
          (favorite) => favorite.userId !== user.id || favorite.nftId !== nftId
        )
        return toFavoriteList(db, user.id)
      })
      return ok(favoriteList, result)
    })
  ),
]
