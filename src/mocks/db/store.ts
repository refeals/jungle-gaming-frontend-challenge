import { anchorClock } from "@/mocks/db/clock"
import { mockDb, type MockDb } from "@/mocks/db/schema"
import { createSeed } from "@/mocks/db/seed"

const STORAGE_KEY = "kurio.mock.v1"

let memoryFallback: MockDb | null = null

function loadStored(): MockDb | null {
  if (memoryFallback) return memoryFallback

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
  } catch {
    memoryFallback = db
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
  const db = createFreshDb()
  writeDb(db)
  return db
}
