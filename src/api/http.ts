import axios from "axios"

import { createNetworkError, toApiError } from "@/api/errors"
import { waitForNetworkReady } from "@/lib/network-ready"

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
  return config
})

http.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(axios.isCancel(error) ? error : toApiError(error))
)
