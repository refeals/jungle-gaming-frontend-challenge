import { createContext } from "react"
import type { Socket } from "socket.io-client"

export type ConnectionStatus = "connecting" | "connected" | "disconnected"

type SocketContextValue = {
  socket: Socket | null
  status: ConnectionStatus
}

export const SocketContext = createContext<SocketContextValue>({
  socket: null,
  status: "connecting",
})
