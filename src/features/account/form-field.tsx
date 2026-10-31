import { useId, type ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const FIELD_CONTROL_CLASS =
  "h-10 w-full rounded-[3px] bg-transparent text-[15px] placeholder:text-[14px] dark:bg-transparent"

export type ControlProps = {
  id: string
  "aria-invalid": true | undefined
  "aria-describedby": string | undefined
  "aria-required": true | undefined
}

type FormFieldProps = {
  label: string
  isRequired?: boolean
  isLabelHidden?: boolean
  error?: string
  className?: string
  labelClassName?: string
  children: (props: ControlProps) => ReactNode
}

export function FormField({
  label,
  isRequired,
  isLabelHidden,
  error,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  const controlId = useId()
  const errorId = useId()

  return (
    <div className={className}>
      <Label
        htmlFor={controlId}
        className={
          isLabelHidden
            ? "sr-only"
            : cn(
                "mb-2.5 flex h-[15px] items-center gap-1 text-[15px]/[15px] font-normal",
                labelClassName
              )
        }
      >
        {label}
        {isRequired && (
          <span
            aria-hidden="true"
            className="text-[22px]/[15px] text-destructive"
          >
            *
          </span>
        )}
      </Label>
      {children({
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
        "aria-required": isRequired ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px]/4 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
