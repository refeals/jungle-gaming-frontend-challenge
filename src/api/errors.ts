import axios from "axios"

import { apiErrorBody } from "@/contracts/common"

type ApiErrorOptions = {
  code: string
  message: string
  fields?: Record<string, string>
  details?: unknown
  status: number | null
  transient: boolean
}

export class ApiError extends Error {
  readonly code: string
  readonly fields: Record<string, string>
  readonly details: unknown
  readonly status: number | null
  readonly transient: boolean

  constructor({
    code,
    message,
    fields,
    details,
    status,
    transient,
  }: ApiErrorOptions) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.fields = fields ?? {}
    this.details = details
    this.status = status
    this.transient = transient
  }
}

export function createNetworkError(): ApiError {
  return new ApiError({
    code: "network_error",
    message: "Não foi possível conectar. Tente novamente.",
    status: null,
    transient: true,
  })
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (!axios.isAxiosError(error)) {
    return new ApiError({
      code: "unknown",
      message: "Algo deu errado. Tente novamente.",
      status: null,
      transient: false,
    })
  }

  if (!error.response) {
    if (error.code !== "ETIMEDOUT") return createNetworkError()

    return new ApiError({
      code: "timeout",
      message: "A conexão demorou demais. Tente novamente.",
      status: null,
      transient: true,
    })
  }

  const { data, status } = error.response
  const transient = status >= 500

  const body = apiErrorBody.safeParse(data)

  if (body.success) {
    return new ApiError({ ...body.data.error, status, transient })
  }

  return new ApiError({
    code: transient ? "server_error" : "request_failed",
    message: "Algo deu errado. Tente novamente.",
    status,
    transient,
  })
}
