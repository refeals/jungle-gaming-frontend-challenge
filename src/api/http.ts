import axios from "axios"

import { createNetworkError, toApiError } from "@/api/errors"
import { getToken } from "@/features/auth/token-storage"
import { getGuestCartId } from "@/features/cart/guest-cart-id"
import { waitForNetworkReady } from "@/lib/network-ready"

let onSessionExpired = () => {}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

export function bearer(token: string | null) {
  return token ? `Bearer ${token}` : undefined
}

function notifyIfSessionExpired(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) return
  if (error.config?.url?.startsWith("/auth/")) return
  if (error.config?.headers.Authorization !== bearer(getToken())) return

  onSessionExpired()
}

export const http = axios.create({
  baseURL: "/api",
  timeout: 10_000,
  transitional: { clarifyTimeoutError: true },
})

http.interceptors.request.use(async (config) => {
  try {
    await waitForNetworkReady()
  } catch {
    throw createNetworkError()
  }

  if (config.headers.Authorization) return config

  const authorization = bearer(getToken())
  const guestCartId = getGuestCartId()
  if (authorization) {
    config.headers.Authorization = authorization
  } else if (guestCartId) {
    config.headers["X-Cart-Id"] = guestCartId
  }

  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  notifyIfSessionExpired(error)
  return Promise.reject(axios.isCancel(error) ? error : toApiError(error))
})
