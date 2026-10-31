import { bearer, http } from "@/api/http"
import type { AddCartItemInput } from "@/contracts"
import { cart, mergeResult } from "@/contracts/cart"

export async function getCart(signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/cart", { signal })
  return cart.parse(data)
}

export async function addCartItem(input: AddCartItemInput) {
  const { data } = await http.post<unknown>("/cart/items", input)
  return cart.parse(data)
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { data } = await http.patch<unknown>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    { quantity }
  )
  return cart.parse(data)
}

export async function removeCartItem(itemId: string) {
  const { data } = await http.delete<unknown>(
    `/cart/items/${encodeURIComponent(itemId)}`
  )
  return cart.parse(data)
}

export async function applyCartCoupon(code: string) {
  const { data } = await http.put<unknown>("/cart/coupon", { code })
  return cart.parse(data)
}

export async function removeCartCoupon() {
  const { data } = await http.delete<unknown>("/cart/coupon")
  return cart.parse(data)
}

export async function mergeCart(guestCartId: string, token?: string) {
  const { data } = await http.post<unknown>(
    "/cart/merge",
    { guestCartId },
    token ? { headers: { Authorization: bearer(token) } } : undefined
  )
  return mergeResult.parse(data)
}
