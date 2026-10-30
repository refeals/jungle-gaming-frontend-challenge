import { useQueryErrorResetBoundary } from "@tanstack/react-query"
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export function ErrorScreen({ reset }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorBoundary = useQueryErrorResetBoundary()

  function handleRetry() {
    queryErrorBoundary.reset()
    reset()
    void router.invalidate()
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 px-6 py-24 text-center"
    >
      <h1 className="text-[28px] font-bold">Algo deu errado</h1>
      <p className="text-[14px]/[24px] text-muted-foreground">
        Não foi possível carregar esta página.
      </p>
      <Button onClick={handleRetry}>Tentar novamente</Button>
    </div>
  )
}
