import { useConnectionStatus } from "@/realtime/connection-status"

export function ConnectionBanner() {
  const status = useConnectionStatus()

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center"
    >
      {status === "disconnected" && (
        <p className="rounded-full border border-border bg-card px-3 py-1 text-[13px]/5">
          Reconectando...
        </p>
      )}
    </div>
  )
}
