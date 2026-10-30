import type { EventEnvelope } from "@/contracts"
import { emitToAll, emitToUser } from "@/mocks/socket/link"

export type PendingEvent = {
  envelope: EventEnvelope
  userId: string | null
}

export function dispatchEvents(events: PendingEvent[]) {
  for (const { envelope, userId } of events) {
    if (userId === null) {
      emitToAll(envelope)
    } else {
      emitToUser(userId, envelope)
    }
  }
}
