import { setupWorker } from "msw/browser"

import { applyUrlScenario, mockControl } from "@/mocks/control"
import { readDb } from "@/mocks/db/store"
import { handlers } from "@/mocks/handlers"
import { resumePendingOrders } from "@/mocks/services/orders"
import { socketHandler } from "@/mocks/socket/link"

const PANEL_STORAGE_KEY = "kurio.mock.panel"

function storePanelPreference(value: string) {
  try {
    sessionStorage.setItem(PANEL_STORAGE_KEY, value)
  } catch {
    return
  }
}

function isPanelHidden() {
  try {
    return sessionStorage.getItem(PANEL_STORAGE_KEY) === "off"
  } catch {
    return false
  }
}

function consumeUrlParams() {
  const url = new URL(location.href)
  const scenario = url.searchParams.get("scenario")
  const panel = url.searchParams.get("panel")

  if (scenario !== null) applyUrlScenario(scenario)
  if (panel !== null) storePanelPreference(panel)

  if (scenario !== null || panel !== null) {
    url.searchParams.delete("scenario")
    url.searchParams.delete("panel")
    history.replaceState(history.state, "", url)
  }
}

export async function startMocks() {
  readDb()
  consumeUrlParams()

  const worker = setupWorker(socketHandler, ...handlers)
  await worker.start({ onUnhandledRequest: "bypass", quiet: true })

  resumePendingOrders()
  window.__mocks = mockControl

  if (!isPanelHidden()) {
    void import("@/mocks/panel/mount")
      .then(({ mountMockPanel }) => mountMockPanel())
      .catch((error: unknown) => console.error(error))
  }
}
