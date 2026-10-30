type FailureExtras = {
  fields?: Record<string, string>
  details?: unknown
}

export class HttpFailure extends Error {
  readonly status: number
  readonly code: string
  readonly extras: FailureExtras

  constructor(
    status: number,
    code: string,
    message: string,
    extras: FailureExtras = {}
  ) {
    super(message)
    this.status = status
    this.code = code
    this.extras = extras
  }
}

export function rejectSession(): never {
  throw new HttpFailure(
    401,
    "session_invalid",
    "Sua sessão expirou. Entre novamente."
  )
}

export function fail(
  status: number,
  code: string,
  message: string,
  extras?: FailureExtras
): never {
  throw new HttpFailure(status, code, message, extras)
}
