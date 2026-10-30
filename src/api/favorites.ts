import { http } from "@/api/http"
import { favoriteList } from "@/contracts/favorite"

export async function getFavorites(signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/favorites", { signal })
  return favoriteList.parse(data).nftIds
}

export async function addFavorite(nftId: string) {
  await http.put(`/favorites/${encodeURIComponent(nftId)}`)
}

export async function removeFavorite(nftId: string) {
  await http.delete(`/favorites/${encodeURIComponent(nftId)}`)
}
