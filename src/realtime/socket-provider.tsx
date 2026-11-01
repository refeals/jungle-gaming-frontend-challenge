import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Socket } from "socket.io-client"

import { queryKeys } from "@/app/query-keys"
import { getToken } from "@/features/auth/token-storage"
import {
  getNetworkReady,
  NetworkReadyTimeout,
  waitForNetworkReady,
} from "@/lib/network-ready"
import { forgetNftEvents } from "@/realtime/applied-nft-events"
import { SocketContext, type ConnectionStatus } from "@/realtime/socket-context"
import { joinSession, setActiveSocket } from "@/realtime/socket-session"

const INTENTIONAL_DISCONNECT = "io client disconnect"
const RECONCILED_KEYS = [
  queryKeys.nfts.all,
  queryKeys.cart.all,
  queryKeys.quote.all,
  queryKeys.orders.all,
]

export function SocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>("connecting")

  useEffect(() => {
    let isCancelled = false
    let current: Socket | null = null
    let needsReconcile = false

    function handleConnect() {
      setStatus("connected")
      joinSession()
      if (needsReconcile) {
        for (const queryKey of RECONCILED_KEYS) {
          void queryClient.invalidateQueries({ queryKey })
        }
        if (getToken()) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
        }
      }
      needsReconcile = false
    }

    function handleConnectionLost() {
      needsReconcile = true
      forgetNftEvents()
      setStatus("disconnected")
    }

    function handleDisconnect(reason: string) {
      if (reason === INTENTIONAL_DISCONNECT) {
        needsReconcile = true
        forgetNftEvents()
        return
      }
      handleConnectionLost()
    }

    waitForNetworkReady()
      .catch((error: unknown) => {
        if (!(error instanceof NetworkReadyTimeout)) throw error
        console.error(error)
        needsReconcile = true
        if (!isCancelled) setStatus("disconnected")
        return getNetworkReady()
      })
      .then(() => import("@/realtime/socket"))
      .then(({ createSocket }) => {
        if (isCancelled) return

        current = createSocket()
        current.on("connect", handleConnect)
        current.on("disconnect", handleDisconnect)
        current.on("connect_error", handleConnectionLost)
        setActiveSocket(current)
        current.connect()
        setSocket(current)
      })
      .catch((error: unknown) => console.error(error))

    return () => {
      isCancelled = true
      current?.off("connect", handleConnect)
      current?.off("disconnect", handleDisconnect)
      current?.off("connect_error", handleConnectionLost)
      current?.disconnect()
      setActiveSocket(null)
      forgetNftEvents()
    }
  }, [queryClient])

  const value = useMemo(() => ({ socket, status }), [socket, status])

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}
