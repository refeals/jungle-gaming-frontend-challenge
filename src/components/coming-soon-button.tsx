import type { ComponentProps } from "react"

import { showComingSoon } from "@/components/coming-soon"

export function ComingSoonButton(props: ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-disabled="true"
      onClick={showComingSoon}
      {...props}
    />
  )
}
