import { createContext, useContext } from "react"

import type { User } from "@/contracts"

export const AuthenticatedUserContext = createContext<User | null>(null)

export function useAuthenticatedUser() {
  const user = useContext(AuthenticatedUserContext)
  if (!user) throw new Error("useAuthenticatedUser needs a private route")
  return user
}
