import { http } from "msw"

import {
  addCartItemInput,
  cart as cartSchema,
  couponInput,
  mergeCartInput,
  mergeResult,
  updateCartItemInput,
} from "@/contracts"
import { readDb, updateDb } from "@/mocks/db/store"
import { optionalSession, requireUser, resolveCart } from "@/mocks/http/auth"
import { ok, pathParam, readBody, route } from "@/mocks/http/respond"
import {
  addCartItem,
  applyCoupon,
  assertWithinLimit,
  findEdition,
  findOwnedItem,
  getOrCreateCart,
  mergeCarts,
  toCartResponse,
} from "@/mocks/services/cart"

export const cartHandlers = [
  http.get(
    "/api/cart",
    route(({ request }) => {
      const db = readDb()
      return ok(cartSchema, toCartResponse(db, resolveCart(db, request).cart))
    })
  ),

  http.post(
    "/api/cart/items",
    route(async ({ request }) => {
      optionalSession(readDb(), request)
      const input = await readBody(request, addCartItemInput)
      const result = updateDb((db) => {
        const { user, cart } = resolveCart(db, request)
        const target = getOrCreateCart(db, user, cart)
        addCartItem(db, target, input)
        return toCartResponse(db, target)
      })
      return ok(cartSchema, result, { status: 201 })
    })
  ),

  http.patch(
    "/api/cart/items/:id",
    route(async ({ request, params }) => {
      optionalSession(readDb(), request)
      const input = await readBody(request, updateCartItemInput)
      const result = updateDb((db) => {
        const { cart } = resolveCart(db, request)
        const item = findOwnedItem(db, cart, pathParam(params, "id"))
        const { edition } = findEdition(db, item.nftId, item.editionId)
        assertWithinLimit(item.nftId, edition, input.quantity)
        item.quantity = input.quantity
        return toCartResponse(db, cart)
      })
      return ok(cartSchema, result)
    })
  ),

  http.delete(
    "/api/cart/items/:id",
    route(({ request, params }) => {
      const result = updateDb((db) => {
        const { cart } = resolveCart(db, request)
        const item = findOwnedItem(db, cart, pathParam(params, "id"))
        if (cart) {
          cart.items = cart.items.filter((other) => other.id !== item.id)
        }
        return toCartResponse(db, cart)
      })
      return ok(cartSchema, result)
    })
  ),

  http.put(
    "/api/cart/coupon",
    route(async ({ request }) => {
      optionalSession(readDb(), request)
      const input = await readBody(request, couponInput)
      const result = updateDb((db) => {
        const { user, cart } = resolveCart(db, request)
        const target = getOrCreateCart(db, user, cart)
        applyCoupon(db, target, input.code)
        return toCartResponse(db, target)
      })
      return ok(cartSchema, result)
    })
  ),

  http.delete(
    "/api/cart/coupon",
    route(({ request }) => {
      const result = updateDb((db) => {
        const { cart } = resolveCart(db, request)
        if (cart) cart.couponCode = null
        return toCartResponse(db, cart)
      })
      return ok(cartSchema, result)
    })
  ),

  http.post(
    "/api/cart/merge",
    route(async ({ request }) => {
      requireUser(readDb(), request)
      const input = await readBody(request, mergeCartInput)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const { cart, adjustments } = mergeCarts(db, user, input.guestCartId)
        return { cart: toCartResponse(db, cart), adjustments }
      })
      return ok(mergeResult, result)
    })
  ),
]
