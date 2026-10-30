import {
  useNavigate,
  useRouter,
  useRouterState,
  useSearch,
} from "@tanstack/react-router"
import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCurrentLocationTarget } from "@/features/auth/use-current-location-target"

export function AuthDialog() {
  const { auth } = useSearch({ from: "__root__" })
  const navigate = useNavigate()
  const router = useRouter()
  const canCloseWithBack = useRouterState({
    select: ({ location }) =>
      Boolean(location.state.authOpenedInPage) && !location.hash,
  })
  const currentLocation = useCurrentLocationTarget()
  const [mode, setMode] = useState(auth)

  if (auth && auth !== mode) {
    setMode(auth)
  }

  function handleOpenChange(open: boolean) {
    if (open) return
    if (canCloseWithBack) {
      router.history.back()
      return
    }
    void navigate({
      ...currentLocation,
      replace: true,
      search: (prev) => ({ ...prev, auth: undefined, redirect: undefined }),
    })
  }

  return (
    <Dialog open={auth !== undefined} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "register" ? "Criar conta" : "Entrar"}</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
