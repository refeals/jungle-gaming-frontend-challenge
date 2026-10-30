import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import { ApiError } from "@/api/errors"

const FALLBACK_MESSAGE = "Algo deu errado. Tente novamente."

export function applyApiError<Values extends FieldValues>(
  error: unknown,
  fieldNames: readonly Path<Values>[],
  setError: UseFormSetError<Values>
): string | null {
  if (!(error instanceof ApiError)) return FALLBACK_MESSAGE
  if (error.code === "session_invalid") return null

  const fieldErrors = fieldNames.filter((name) => error.fields[name])
  fieldErrors.forEach((name, index) => {
    setError(
      name,
      { type: "server", message: error.fields[name] },
      { shouldFocus: index === 0 }
    )
  })

  return fieldErrors.length > 0 ? null : error.message
}
