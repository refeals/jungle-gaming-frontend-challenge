import type { MockDb } from "@/mocks/db/schema"

export function nextId(db: MockDb, prefix: string) {
  db.sequence += 1
  return `${prefix}-${db.sequence}`
}
