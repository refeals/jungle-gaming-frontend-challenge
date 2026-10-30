import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FIELD_CONTROL_CLASS } from "@/features/account/form-field"
import { cn } from "@/lib/utils"

const ENS_DOMAIN = ".eth"
const items = [{ value: ENS_DOMAIN, label: ENS_DOMAIN }]

export function EnsInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="flex gap-2.5">
      <Select items={items} value={ENS_DOMAIN}>
        <SelectTrigger
          aria-label="Domínio do nome ENS"
          className="h-10! w-[78px] shrink-0 rounded-[3px] pr-2 pl-2.5 text-[15px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value={ENS_DOMAIN}>{ENS_DOMAIN}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        {...props}
        className={cn(FIELD_CONTROL_CLASS, "min-w-0", className)}
      />
    </div>
  )
}
