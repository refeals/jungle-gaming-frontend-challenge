import { useIsMutating } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { HeartIcon, HeartOutlineIcon } from "@/components/icons"
import { getReturnTarget } from "@/features/auth/return-target"
import { useSession } from "@/features/auth/session"
import {
  FAVORITE_ERROR_MESSAGE,
  favoriteMutationKey,
  useFavoriteIds,
  useToggleFavorite,
} from "@/features/favorites/queries"
import { notify } from "@/lib/notify"

type FavoriteButtonProps = {
  nftId: string
  nftName: string
  className?: string
  iconClassName?: string
  children?: ReactNode
}

export function FavoriteButton({
  nftId,
  nftName,
  className,
  iconClassName,
  children,
}: FavoriteButtonProps) {
  const { data: session, isPending: isSessionPending } = useSession()
  const { data: favoriteIds, refetch } = useFavoriteIds()
  const toggleFavorite = useToggleFavorite(nftId)
  const inFlight = useIsMutating({ mutationKey: favoriteMutationKey(nftId) })
  const navigate = useNavigate()
  const router = useRouter()

  const isFavorite = favoriteIds?.includes(nftId) ?? false
  const isBusy = inFlight > 0
  const Icon = isFavorite ? HeartIcon : HeartOutlineIcon

  function handleClick() {
    if (isBusy || isSessionPending) return

    if (session === undefined) {
      notify(FAVORITE_ERROR_MESSAGE)
      return
    }

    if (session === null) {
      const { location } = router.state
      void navigate({
        to: location.pathname as ".",
        hash: true,
        resetScroll: false,
        hashScrollIntoView: false,
        state: { authOpenedInPage: true },
        search: (prev) => ({
          ...prev,
          auth: "login",
          redirect: getReturnTarget(location),
        }),
      })
      return
    }

    if (!favoriteIds) {
      void refetch()
      return
    }

    toggleFavorite.mutate({ userId: session.user.id, wasFavorite: isFavorite })
  }

  return (
    <button
      type="button"
      aria-label={`Favoritar ${nftName}`}
      aria-pressed={isFavorite}
      aria-disabled={isBusy || undefined}
      onClick={handleClick}
      className={className}
    >
      <Icon className={iconClassName} />
      {children}
    </button>
  )
}
