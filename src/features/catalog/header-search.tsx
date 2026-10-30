import { useSearch } from "@tanstack/react-router"
import { useRef, useState } from "react"

import { SearchIcon } from "@/components/icons"
import { SearchInput } from "@/features/catalog/search-input"

export function HeaderSearch() {
  const q = useSearch({ strict: false, select: (search) => search.q ?? "" })
  const [isOpen, setIsOpen] = useState(Boolean(q))
  const toggleRef = useRef<HTMLButtonElement>(null)

  function close() {
    setIsOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <div className="relative flex">
      <button
        ref={toggleRef}
        type="button"
        aria-label="Buscar"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <SearchIcon className="size-5" />
      </button>
      {isOpen && (
        <SearchInput
          autoFocus={!q}
          onEscape={close}
          className="absolute top-full right-0 z-30 mt-3 w-72 border border-border"
        />
      )}
    </div>
  )
}
