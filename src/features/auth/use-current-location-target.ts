import { useRouterState } from "@tanstack/react-router"

export function useCurrentLocationTarget() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return {
    to: pathname as ".",
    hash: true,
    resetScroll: false,
    hashScrollIntoView: false,
  } as const
}
