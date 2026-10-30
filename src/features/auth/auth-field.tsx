import { useId, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/features/auth/password-input"
import { cn } from "@/lib/utils"

const INPUT_CLASS =
  "bg-transparent placeholder:text-[14px] max-md:h-[50px] max-md:rounded-[10px] dark:bg-transparent"

type AuthFieldProps = ComponentProps<typeof Input> & {
  label: string
  error?: string
  isPassword?: boolean
  toggleClassName?: string
}

export function AuthField({
  label,
  error,
  isPassword,
  toggleClassName,
  className,
  ...props
}: AuthFieldProps) {
  const inputId = useId()
  const errorId = useId()
  const fieldProps = {
    ...props,
    id: inputId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: cn(INPUT_CLASS, className),
  }

  return (
    <div>
      <Label htmlFor={inputId} className="sr-only">
        {label}
      </Label>
      {isPassword ? (
        <PasswordInput {...fieldProps} toggleClassName={toggleClassName} />
      ) : (
        <Input {...fieldProps} />
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px]/4 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
