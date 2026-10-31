import { Link, useCanGoBack, useRouter } from "@tanstack/react-router"

import { ChevronLeftIcon } from "@/components/icons"

export const ROUND_ACTION =
  "flex size-[35px] items-center justify-center rounded-full border border-border bg-secondary text-primary"

export function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  if (canGoBack) {
    return (
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => router.history.back()}
        className={ROUND_ACTION}
      >
        <ChevronLeftIcon className="size-5" />
      </button>
    )
  }

  return (
    <Link to="/" aria-label="Voltar ao início" className={ROUND_ACTION}>
      <ChevronLeftIcon className="size-5" />
    </Link>
  )
}
