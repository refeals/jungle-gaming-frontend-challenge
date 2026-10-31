import { useRef } from "react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  ReviewContent,
  type ReviewProps,
} from "@/features/checkout/review-content"

export function ReviewDialog({
  isOpen,
  isSending,
  onClose,
  ...content
}: ReviewProps & {
  isOpen: boolean
  isSending: () => boolean
  onClose: () => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSending()) onClose()
      }}
    >
      <DialogContent
        initialFocus={titleRef}
        showCloseButton={!content.isPending}
        className="max-h-dvh max-w-[560px] overflow-y-auto"
      >
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-[18px]/6 font-bold outline-none"
        >
          Revise seu pedido
        </DialogTitle>
        <ReviewContent {...content} />
      </DialogContent>
    </Dialog>
  )
}
