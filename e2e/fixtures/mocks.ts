import { test as base, type Page } from "@playwright/test"

type MockState = {
  mock: {
    scenario: string
    latencyMs: number
    connectionBlocked: boolean
    connectionCount: number
  }
  clock: { baseIso: string; anchorMs: number | null }
  orders: { id: string }[]
}

type MockControl = {
  scenario(name: string): void
  latency(ms: number): void
  emit(type: string, resourceId: string, data: object): void
  emitRaw(envelope: object): void
  dropConnection(): void
  restoreConnection(): void
  reset(): void
  setClock(iso: string): void
  settlePending(outcome?: string): void
  state(): MockState
}

type MockWindow = Window & { __mocks: MockControl }

export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => "__mocks" in window)
}

function createMocks(page: Page) {
  return {
    scenario: (name: string) =>
      page.evaluate(
        (value) => (window as unknown as MockWindow).__mocks.scenario(value),
        name
      ),
    latency: (ms: number) =>
      page.evaluate(
        (value) => (window as unknown as MockWindow).__mocks.latency(value),
        ms
      ),
    emit: (type: string, resourceId: string, data: object) =>
      page.evaluate(
        (args) =>
          (window as unknown as MockWindow).__mocks.emit(
            args.type,
            args.resourceId,
            args.data
          ),
        { type, resourceId, data }
      ),
    emitRaw: (envelope: object) =>
      page.evaluate(
        (value) => (window as unknown as MockWindow).__mocks.emitRaw(value),
        envelope
      ),
    dropConnection: () =>
      page.evaluate(() =>
        (window as unknown as MockWindow).__mocks.dropConnection()
      ),
    restoreConnection: () =>
      page.evaluate(() =>
        (window as unknown as MockWindow).__mocks.restoreConnection()
      ),
    reset: () =>
      page.evaluate(() => (window as unknown as MockWindow).__mocks.reset()),
    setClock: (iso: string) =>
      page.evaluate(
        (value) => (window as unknown as MockWindow).__mocks.setClock(value),
        iso
      ),
    settlePending: (outcome?: string) =>
      page.evaluate(
        (value) =>
          (window as unknown as MockWindow).__mocks.settlePending(value),
        outcome
      ),
    state: (): Promise<MockState> =>
      page.evaluate(() => (window as unknown as MockWindow).__mocks.state()),
  }
}

type Mocks = ReturnType<typeof createMocks>

export const test = base.extend<{ mocks: Mocks }>({
  mocks: [
    async ({ page }, use) => {
      await page.goto("/?panel=off")
      await waitForMocks(page)
      const mocks = createMocks(page)
      await mocks.reset()
      await use(mocks)
    },
    { auto: true },
  ],
})

export { expect } from "@playwright/test"
