import { EyeIcon } from "lucide-react"
import { useState, type ComponentProps } from "react"

import { HideIcon } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = ComponentProps<typeof Input> & {
  toggleClassName?: string
}

export function PasswordInput({
  className,
  toggleClassName,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        aria-label="Mostrar senha"
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className={cn(
          "absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-[5px] text-subtle-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          toggleClassName
        )}
      >
        {isVisible ? (
          <EyeIcon className="size-[18px]" aria-hidden="true" />
        ) : (
          <HideIcon className="h-5 w-[23px]" />
        )}
      </button>
    </div>
  )
}
