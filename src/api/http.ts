import axios from "axios"

import { toApiError } from "@/api/errors"
import { networkReady } from "@/lib/network-ready"

export const http = axios.create({
  baseURL: "/api",
  timeout: 10_000,
  transitional: { clarifyTimeoutError: true },
})

http.interceptors.request.use(async (config) => {
  await networkReady
  return config
})

http.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(axios.isCancel(error) ? error : toApiError(error))
)
