import { lazy, Suspense, useSyncExternalStore } from "react"

import { LazyBoundary } from "@/components/lazy-boundary"
import { useSession } from "@/features/auth/session"
import {
  getPendingOrderId,
  subscribeToPendingOrderId,
} from "@/features/orders/pending-order-storage"

const PendingOrderBanner = lazy(() =>
  import("@/features/orders/pending-order-banner").then((module) => ({
    default: module.PendingOrderBanner,
  }))
)

export function PendingOrderGate({ pathname }: { pathname: string }) {
  const { data: session } = useSession()
  const orderId = useSyncExternalStore(
    subscribeToPendingOrderId,
    getPendingOrderId
  )

  if (!session || !orderId || pathname === `/orders/${orderId}`) return null

  return (
    <LazyBoundary fallback={null}>
      <Suspense fallback={null}>
        <PendingOrderBanner userId={session.user.id} orderId={orderId} />
      </Suspense>
    </LazyBoundary>
  )
}
