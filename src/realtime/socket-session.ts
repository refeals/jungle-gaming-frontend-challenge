import type { Socket } from "socket.io-client"

import { getToken } from "@/features/auth/token-storage"

let activeSocket: Socket | null = null

export function setActiveSocket(socket: Socket | null) {
  activeSocket = socket
}

export function disconnectSocket() {
  activeSocket?.disconnect()
}

export function connectSocket() {
  activeSocket?.connect()
}

export function joinSession() {
  const token = getToken()
  if (token && activeSocket?.connected) {
    activeSocket.emit("session.join", { token })
  }
}
