import { useIsMutating, useQueryClient } from "@tanstack/react-query"
import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
  useSearch,
} from "@tanstack/react-router"
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { ComingSoonButton } from "@/components/coming-soon-button"
import { FacebookLoginIcon, GoogleIcon } from "@/components/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { getExpiredUserId } from "@/features/auth/expired-session"
import { LoginForm } from "@/features/auth/login-form"
import {
  getReturnTarget,
  sanitizeReturnTarget,
} from "@/features/auth/return-target"
import { RegisterForm } from "@/features/auth/register-form"
import { AUTH_MUTATION_KEY, useSession } from "@/features/auth/session"
import { resetPrivateState } from "@/features/auth/session-reset"
import { useCurrentLocationTarget } from "@/features/auth/use-current-location-target"
import { cn } from "@/lib/utils"

const SOCIAL_BUTTON =
  "flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-input text-[13px]/4 font-medium text-muted-foreground"

type AuthMode = "login" | "register"

function ModeLink({
  mode,
  className,
  children,
  ...props
}: {
  mode: AuthMode
  className?: string
  children: ReactNode
  "aria-current"?: "page"
}) {
  const currentLocation = useCurrentLocationTarget()

  return (
    <Link
      {...currentLocation}
      replace
      state={(prev) => prev}
      search={(prev) => ({ ...prev, auth: mode })}
      className={className}
      {...props}
    >
      {children}
    </Link>
  )
}

function ModeTabs({ mode }: { mode: AuthMode }) {
  const tabClass = (tab: AuthMode) =>
    cn(
      "text-[20px]/4 font-medium",
      tab === mode ? "text-brand-text" : "text-foreground"
    )

  return (
    <div className="flex items-center justify-center gap-2 max-md:hidden">
      <ModeLink
        mode="login"
        aria-current={mode === "login" ? "page" : undefined}
        className={tabClass("login")}
      >
        Entrar
      </ModeLink>
      <span aria-hidden="true" className="h-5 w-px bg-destructive" />
      <ModeLink
        mode="register"
        aria-current={mode === "register" ? "page" : undefined}
        className={tabClass("register")}
      >
        Criar conta
      </ModeLink>
    </div>
  )
}

function SocialLogin({ mode }: { mode: AuthMode }) {
  return (
    <div className="mt-6 max-md:mt-10">
      <div className="flex items-center gap-3 md:-mx-20">
        <span className="h-px flex-1 bg-input" />
        <p className="text-[13px]/4">Ou continue com</p>
        <span className="h-px flex-1 bg-input" />
      </div>
      <div
        className={cn(
          "mt-3 flex flex-col",
          mode === "login" ? "gap-3 max-md:gap-4" : "gap-4"
        )}
      >
        <ComingSoonButton className={SOCIAL_BUTTON}>
          <GoogleIcon className="size-5" />
          Continuar com Google
        </ComingSoonButton>
        <ComingSoonButton className={SOCIAL_BUTTON}>
          <FacebookLoginIcon className="size-5" />
          Continuar com Facebook
        </ComingSoonButton>
      </div>
    </div>
  )
}

export function AuthDialog() {
  const { auth, redirect } = useSearch({ from: "__root__" })
  const navigate = useNavigate()
  const router = useRouter()
  const canCloseWithBack = useRouterState({
    select: ({ location }) =>
      Boolean(location.state.authOpenedInPage) && !location.hash,
  })
  const currentLocation = useCurrentLocationTarget()
  const [mode, setMode] = useState<AuthMode>(auth ?? "login")
  const isSessionExpired = getExpiredUserId() !== null
  const formContainerRef = useRef<HTMLDivElement>(null)
  const hasLeftDialog = useRef(false)
  const { data: session } = useSession()
  const isAuthenticated = Boolean(session)
  const queryClient = useQueryClient()
  const isSubmitting = useIsMutating({ mutationKey: AUTH_MUTATION_KEY }) > 0

  if (auth && auth !== mode) {
    setMode(auth)
  }

  function closeDialog() {
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

  function handleOpenChange(open: boolean) {
    if (
      open ||
      queryClient.isMutating({ mutationKey: AUTH_MUTATION_KEY }) > 0
    ) {
      return
    }
    if (getExpiredUserId() !== null) {
      resetPrivateState()
      void navigate({ to: "/", replace: true })
      return
    }
    closeDialog()
  }

  function handleAuthenticated() {
    const target = redirect && sanitizeReturnTarget(redirect)
    const isCurrentPage = target === getReturnTarget(router.state.location)

    if (target && !(canCloseWithBack && isCurrentPage)) {
      void navigate({ href: target, replace: true, resetScroll: false })
      return
    }
    closeDialog()
  }

  const leaveDialog = useEffectEvent(handleAuthenticated)

  useEffect(() => {
    if (!auth) {
      hasLeftDialog.current = false
      return
    }
    if (!isAuthenticated || hasLeftDialog.current) return

    hasLeftDialog.current = true
    leaveDialog()
  }, [auth, isAuthenticated])

  return (
    <Dialog
      open={auth !== undefined && session === null}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        showCloseButton={!isSubmitting}
        initialFocus={(openType) =>
          openType === "touch"
            ? true
            : formContainerRef.current?.querySelector("input")
        }
        className={cn(
          "block p-0 md:max-h-dvh md:overflow-y-auto",
          mode === "login"
            ? "md:min-h-[600px]"
            : "md:min-h-[656px] md:rounded-lg"
        )}
      >
        <DialogTitle className="sr-only">
          {mode === "register" ? "Criar conta" : "Entrar"}
        </DialogTitle>

        <div className="px-7 pt-[127px] pb-7 md:px-20 md:pt-12 md:pb-10">
          <div aria-hidden="true" className="text-center md:hidden">
            <p className="text-[32px]/[42px] font-bold tracking-[1.6px]">
              KURIO
            </p>
            <p
              className={cn(
                "mt-[87px] font-bold",
                mode === "register" ? "text-[18px]/4" : "text-[20px]/4"
              )}
            >
              {mode === "register" ? "Criar perfil de colecionador" : "Entrar"}
            </p>
          </div>

          <ModeTabs mode={mode} />

          <DialogDescription className="mt-10 text-center text-[13px]/4 text-foreground max-md:sr-only md:-mx-8">
            {mode === "register"
              ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
              : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
          </DialogDescription>

          {isSessionExpired && (
            <p
              role="alert"
              className="mt-4 text-center text-[13px]/4 text-brand-text"
            >
              Sua sessão expirou. Entre novamente para continuar.
            </p>
          )}

          <div ref={formContainerRef} className="mt-6 max-md:mt-10">
            {mode === "register" ? <RegisterForm /> : <LoginForm />}
          </div>

          <SocialLogin mode={mode} />

          <p className="mt-10 text-center text-[15px]/5 text-muted-foreground md:hidden">
            {mode === "register" ? (
              <ModeLink mode="login">Já tem uma conta? Entre</ModeLink>
            ) : (
              <ModeLink mode="register">Novo na Kurio? Crie uma conta</ModeLink>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
