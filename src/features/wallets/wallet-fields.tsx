import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ControlProps } from "@/features/account/form-field"

const SELECT_TRIGGER =
  "h-10! w-full rounded-[3px] pr-3 pl-3.5 text-[15px] data-placeholder:text-[14px] data-placeholder:text-subtle-foreground"

type SelectFieldProps<Values extends FieldValues> = {
  name: FieldPath<Values>
  control: Control<Values>
  items: { value: string; label: string }[]
  placeholder: string
  controlProps: ControlProps
  onValueSelected?: (value: string) => void
}

export function SelectField<Values extends FieldValues>({
  name,
  control,
  items,
  placeholder,
  controlProps,
  onValueSelected,
}: SelectFieldProps<Values>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Select
          items={items}
          value={field.value ?? null}
          onValueChange={(value) => {
            field.onChange(value ?? undefined)
            if (value) onValueSelected?.(value)
          }}
        >
          <SelectTrigger
            {...controlProps}
            ref={field.ref}
            onBlur={field.onBlur}
            className={SELECT_TRIGGER}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}
