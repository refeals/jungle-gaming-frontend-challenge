import type { MockDb } from "@/mocks/db/schema"

export function anchorClock(db: MockDb) {
  db.clock.anchorMs = Date.now()
}

export function now(db: MockDb): Date {
  const { baseIso, anchorMs } = db.clock
  const elapsed = anchorMs === null ? 0 : Date.now() - anchorMs
  return new Date(new Date(baseIso).getTime() + elapsed)
}

export function setClock(db: MockDb, iso: string) {
  db.clock.baseIso = iso
  anchorClock(db)
}
