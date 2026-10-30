import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Socket } from "socket.io-client"

import { queryKeys } from "@/app/query-keys"
import { waitForNetworkReady } from "@/lib/network-ready"
import { forgetNftEvents } from "@/realtime/applied-nft-events"
import { SocketContext, type ConnectionStatus } from "@/realtime/socket-context"

const RECONCILED_KEYS = [queryKeys.nfts.all, queryKeys.cart, queryKeys.quote]

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
      if (needsReconcile) {
        for (const queryKey of RECONCILED_KEYS) {
          void queryClient.invalidateQueries({ queryKey })
        }
      }
      needsReconcile = false
    }

    function handleConnectionLost() {
      needsReconcile = true
      forgetNftEvents()
      setStatus("disconnected")
    }

    waitForNetworkReady()
      .then(() => import("@/realtime/socket"))
      .then(({ createSocket }) => {
        if (isCancelled) return

        current = createSocket()
        current.on("connect", handleConnect)
        current.on("disconnect", handleConnectionLost)
        current.on("connect_error", handleConnectionLost)
        current.connect()
        setSocket(current)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!isCancelled) setStatus("disconnected")
      })

    return () => {
      isCancelled = true
      current?.off("connect", handleConnect)
      current?.off("disconnect", handleConnectionLost)
      current?.off("connect_error", handleConnectionLost)
      current?.disconnect()
      forgetNftEvents()
    }
  }, [queryClient])

  const value = useMemo(() => ({ socket, status }), [socket, status])

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}
