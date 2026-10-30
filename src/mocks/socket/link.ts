import { toSocketIo } from "@mswjs/socket.io-binding"
import { ws, type WebSocketHandlerConnection } from "msw"

import { eventEnvelope, sessionJoinPayload } from "@/contracts"
import type { EventEnvelope } from "@/contracts"
import { now } from "@/mocks/db/clock"
import { readDb } from "@/mocks/db/store"
import { readConfig } from "@/mocks/scenarios/config"

const PING_INTERVAL = 25_000

const realtime = ws.link(`${import.meta.env.VITE_SOCKET_URL}/*`)

type SocketClient = {
  connection: WebSocketHandlerConnection
  io: ReturnType<typeof toSocketIo>
  token: string | null
}

const clients = new Set<SocketClient>()

function findSessionUserId(token: string) {
  const db = readDb()
  const session = db.sessions.find((item) => item.token === token)
  if (!session || new Date(session.expiresAt) <= now(db)) return null
  return session.userId
}

function send(client: SocketClient, envelope: EventEnvelope) {
  client.io.client.emit(envelope.type, envelope)
}

export function emitToAll(envelope: EventEnvelope) {
  const validated = eventEnvelope.parse(envelope)
  clients.forEach((client) => send(client, validated))
}

export function emitToUser(userId: string, envelope: EventEnvelope) {
  const validated = eventEnvelope.parse(envelope)
  clients.forEach((client) => {
    if (client.token && findSessionUserId(client.token) === userId) {
      send(client, validated)
    }
  })
}

export function dropConnections() {
  clients.forEach((client) => client.connection.client.close())
}

export function getConnectionCount() {
  return clients.size
}

export function getJoinedConnectionCount() {
  return [...clients].filter(
    ({ token }) => token !== null && findSessionUserId(token) !== null
  ).length
}

export const socketHandler = realtime.addEventListener(
  "connection",
  (connection) => {
    if (readConfig().connectionBlocked) {
      setTimeout(() => {
        const { socket } = connection.client as unknown as {
          socket?: WebSocket
        }
        socket?.dispatchEvent(new Event("error"))
        connection.client.close()
      })
      return
    }

    const client: SocketClient = {
      connection,
      io: toSocketIo(connection),
      token: null,
    }
    const pingTimer = setInterval(
      () => connection.client.send("2"),
      PING_INTERVAL
    )

    clients.add(client)

    client.io.client.on("session.join", (_event, payload) => {
      const parsed = sessionJoinPayload.safeParse(payload)
      client.token = parsed.success ? parsed.data.token : null
    })

    connection.client.addEventListener("close", () => {
      clearInterval(pingTimer)
      clients.delete(client)
    })
  }
)
