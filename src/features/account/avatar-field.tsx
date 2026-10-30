import { useId, useRef, useState, type ChangeEvent } from "react"

import { ApiError } from "@/api/errors"
import { ImageIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import type { Profile } from "@/contracts"
import { useRemoveAvatar, useUpdateAvatar } from "@/features/account/queries"
import {
  ACCEPTED_IMAGE_TYPES,
  AvatarFileError,
  resizeAvatar,
} from "@/features/account/resize-image"
import { notify } from "@/lib/notify"

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "session_invalid") return null
  if (error instanceof AvatarFileError || error instanceof ApiError) {
    return error.message
  }
  return "Não foi possível atualizar o avatar."
}

export function AvatarField({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errorId = useId()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const updateAvatar = useUpdateAvatar(profile.id)
  const removeAvatar = useRemoveAvatar(profile.id)
  const isBusy = isProcessing || removeAvatar.isPending

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)
    setIsProcessing(true)
    try {
      const dataUrl = await resizeAvatar(file)
      await updateAvatar.mutateAsync({ dataUrl })
      notify("Avatar atualizado.")
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setIsProcessing(false)
    }
  }

  function handleRemove() {
    setError(null)
    removeAvatar.mutate(undefined, {
      onSuccess: () => notify("Avatar removido."),
      onError: (caught) => setError(toErrorMessage(caught)),
    })
  }

  return (
    <div>
      <p className="mb-2.5 text-[15px]/[15px]">Avatar</p>
      <div className="flex items-center gap-6">
        <div className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-[#2f1d15] text-primary">
          {profile.avatarDataUrl ? (
            <img
              src={profile.avatarDataUrl}
              alt="Avatar atual"
              width={50}
              height={50}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6" />
          )}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          aria-label="Selecionar imagem do avatar"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          tabIndex={-1}
          onChange={(event) => void handleFile(event)}
          className="sr-only"
        />
        <Button
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className="h-10 w-[98px] rounded-[3px] px-0 text-[14px]"
        >
          Alterar
        </Button>
        {profile.avatarDataUrl && (
          <button
            type="button"
            disabled={isBusy}
            onClick={handleRemove}
            className="rounded-[3px] text-[14px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            Remover
          </button>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[13px]/4 text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
