import { anchorClock } from "@/mocks/db/clock"
import { mockDb, type MockDb } from "@/mocks/db/schema"
import { createSeed } from "@/mocks/db/seed"

const STORAGE_KEY = "kurio.mock.v3"

let memoryFallback: MockDb | null = null

function loadStored(): MockDb | null {
  if (memoryFallback) return structuredClone(memoryFallback)

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = mockDb.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function createFreshDb(): MockDb {
  const db = createSeed()
  anchorClock(db)
  return db
}

export function writeDb(db: MockDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    memoryFallback = null
  } catch (error) {
    console.warn("Mock sem persistência: localStorage indisponível.", error)
    memoryFallback = structuredClone(db)
  }
}

export function readDb(): MockDb {
  const stored = loadStored()
  if (stored) return stored

  const db = createFreshDb()
  writeDb(db)
  return db
}

export function updateDb<Result>(change: (db: MockDb) => Result): Result {
  const db = readDb()
  const result = change(db)
  writeDb(db)
  return result
}

export function resetDb(): MockDb {
  const previousSequence = loadStored()?.sequence ?? 0
  const db = createFreshDb()
  db.sequence = Math.max(db.sequence, previousSequence)
  writeDb(db)
  return db
}
