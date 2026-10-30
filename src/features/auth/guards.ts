import type { QueryClient } from "@tanstack/react-query"
import { redirect, type ParsedLocation } from "@tanstack/react-router"

import { getExpiredUserId } from "@/features/auth/expired-session"
import { getReturnTarget } from "@/features/auth/return-target"
import { sessionOptions } from "@/features/auth/session"
import { resetPrivateState } from "@/features/auth/session-reset"

export async function requireAuth(
  context: { queryClient: QueryClient },
  location: ParsedLocation<{ auth?: string }>
) {
  const session = await context.queryClient.ensureQueryData(sessionOptions)
  if (session) return

  if (getExpiredUserId()) {
    if (location.search.auth) return
    resetPrivateState()
  }

  throw redirect({
    to: "/",
    search: { auth: "login", redirect: getReturnTarget(location) },
  })
}
