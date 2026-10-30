import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { AccountLayout } from "@/features/account/account-layout"
import {
  AccountError,
  AccountFormSkeleton,
} from "@/features/account/account-states"
import { ProfileForm } from "@/features/account/profile-form"
import { profileOptions } from "@/features/account/queries"
import { useAuthenticatedUser } from "@/features/auth/authenticated-user"
import { useSession } from "@/features/auth/session"

function ProfileContent() {
  const user = useAuthenticatedUser()
  const { data: session } = useSession()
  const {
    data: profile,
    isError,
    refetch,
  } = useQuery({
    ...profileOptions(user.id),
    enabled: Boolean(session),
  })

  if (!profile && isError) {
    return (
      <AccountError
        title="Não foi possível carregar seu perfil"
        onRetry={() => void refetch()}
      />
    )
  }

  if (!profile) return <AccountFormSkeleton />

  return <ProfileForm profile={profile} />
}

function ProfilePage() {
  return (
    <AccountLayout>
      <ProfileContent />
    </AccountLayout>
  )
}

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
})
