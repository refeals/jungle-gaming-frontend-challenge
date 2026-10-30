import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router"
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"

import { SearchIcon } from "@/components/icons"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 300

type SearchInputProps = {
  className?: string
  autoFocus?: boolean
  onEscape?: () => void
  onBlur?: () => void
}

export function SearchInput({
  className,
  autoFocus,
  onEscape,
  onBlur,
}: SearchInputProps) {
  const inputId = useId()
  const navigate = useNavigate()
  const isHome = useRouterState({
    select: ({ location }) => location.pathname === "/",
  })
  const q = useSearch({ strict: false, select: (search) => search.q ?? "" })
  const [value, setValue] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)

  const [wasHome, setWasHome] = useState(isHome)

  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== value.trim()) setValue(q)
  }

  if (isHome !== wasHome) {
    setWasHome(isHome)
    setValue(q)
  }

  useEffect(() => {
    const term = value.trim()
    if (!isHome || term === q) return

    const timer = setTimeout(() => {
      void navigate({
        to: "/",
        search: (prev) => ({ ...prev, q: term || undefined, page: undefined }),
        replace: true,
        resetScroll: false,
      })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [isHome, navigate, q, value])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (isHome) return
    void navigate({
      to: "/",
      search: { q: value.trim() || undefined },
      hash: "catalog",
    })
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") onEscape?.()
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        "flex h-[45px] items-center gap-2 rounded-[10px] bg-card px-3",
        className
      )}
    >
      <Label htmlFor={inputId} className="sr-only">
        Buscar NFTs
      </Label>
      <SearchIcon className="size-[22px] shrink-0 text-subtle-foreground" />
      <input
        id={inputId}
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder="Explorar coleções"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        className="w-full min-w-0 bg-transparent text-[14px]/4 font-bold text-foreground outline-none placeholder:text-subtle-foreground"
      />
    </form>
  )
}
