import * as z from "zod/mini"

import { scenarioName } from "@/mocks/scenarios"

const STORAGE_KEY = "kurio.mock.config.v1"

const mockConfig = z.object({
  scenario: scenarioName,
  latencyMs: z.number(),
  consumed: z.boolean(),
  connectionBlocked: z.boolean(),
})

export type MockConfig = z.infer<typeof mockConfig>

const DEFAULT_CONFIG: MockConfig = {
  scenario: "default",
  latencyMs: 0,
  consumed: false,
  connectionBlocked: false,
}

let memoryFallback: MockConfig | null = null

export function readConfig(): MockConfig {
  if (memoryFallback) return memoryFallback

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_CONFIG
    const parsed = mockConfig.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

function writeConfig(config: MockConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    memoryFallback = null
  } catch {
    memoryFallback = config
  }
}

export function updateConfig(change: Partial<MockConfig>) {
  writeConfig({ ...readConfig(), ...change })
}

export function resetConfig() {
  writeConfig(DEFAULT_CONFIG)
}
