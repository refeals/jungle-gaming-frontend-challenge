import type { CartChange } from "@/features/cart/cart-changes"

export function CartChangesNotice({
  changes,
  onDismiss,
}: {
  changes: CartChange[]
  onDismiss: () => void
}) {
  return (
    <div role="status">
      {changes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-primary bg-card px-4 py-3 md:mt-3">
          <ul className="flex flex-col gap-1 text-[14px]/5">
            {changes.map((change) => (
              <li key={change.id}>{change.message}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[14px]/5 font-bold text-brand-text underline"
          >
            Entendi
          </button>
        </div>
      )}
    </div>
  )
}
