import { useContext } from "react"

import { SocketContext } from "@/realtime/socket-context"

export function useConnectionStatus() {
  return useContext(SocketContext).status
}
