import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useState } from "react"

import { SkeletonShimmer } from "@/components/skeleton-shimmer"
import { AuthenticatedUserContext } from "@/features/auth/authenticated-user"
import { requireAuth } from "@/features/auth/guards"
import { useSession } from "@/features/auth/session"

function AuthenticatedLayout() {
  const { data: session } = useSession()
  const [user, setUser] = useState(session?.user ?? null)

  if (session && session.user !== user) {
    setUser(session.user)
  }

  if (!user) return null

  return (
    <AuthenticatedUserContext.Provider value={user}>
      <Outlet key={user.id} />
    </AuthenticatedUserContext.Provider>
  )
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => requireAuth(context, location),
  component: AuthenticatedLayout,
  pendingComponent: () => (
    <SkeletonShimmer
      role="status"
      aria-label="Carregando"
      className="mt-8 h-96 w-full"
    />
  ),
})
