import axios from "axios"

type ApiErrorBody = {
  code: string
  message: string
  fields?: Record<string, string>
}

type ApiErrorOptions = ApiErrorBody & {
  status: number | null
  transient: boolean
}

export class ApiError extends Error {
  readonly code: string
  readonly fields: Record<string, string>
  readonly status: number | null
  readonly transient: boolean

  constructor({ code, message, fields, status, transient }: ApiErrorOptions) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.fields = fields ?? {}
    this.status = status
    this.transient = transient
  }
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== "object" || data === null) return false
  const body = data as Record<string, unknown>
  return typeof body.code === "string" && typeof body.message === "string"
}

export function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError({
      code: "unknown",
      message: "Algo deu errado. Tente novamente.",
      status: null,
      transient: false,
    })
  }

  if (!error.response) {
    const timedOut = error.code === "ETIMEDOUT"
    return new ApiError({
      code: timedOut ? "timeout" : "network_error",
      message: timedOut
        ? "A conexão demorou demais. Tente novamente."
        : "Não foi possível conectar. Tente novamente.",
      status: null,
      transient: true,
    })
  }

  const { data, status } = error.response
  const transient = status >= 500

  if (isApiErrorBody(data)) {
    return new ApiError({ ...data, status, transient })
  }

  return new ApiError({
    code: transient ? "server_error" : "request_failed",
    message: "Algo deu errado. Tente novamente.",
    status,
    transient,
  })
}
