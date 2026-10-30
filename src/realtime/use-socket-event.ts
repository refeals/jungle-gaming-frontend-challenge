import { useContext, useEffect, useEffectEvent } from "react"

import { SocketContext } from "@/realtime/socket-context"

export function useSocketEvent(
  name: string,
  handler: (payload: unknown) => void
) {
  const { socket } = useContext(SocketContext)
  const onEvent = useEffectEvent(handler)

  useEffect(() => {
    if (!socket) return

    const listener = (payload: unknown) => onEvent(payload)
    socket.on(name, listener)
    return () => {
      socket.off(name, listener)
    }
  }, [name, socket])
}
