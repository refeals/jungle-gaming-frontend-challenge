import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { MockPanel } from "@/mocks/panel/mock-panel"

export function mountMockPanel() {
  const container = document.createElement("div")
  document.body.append(container)

  createRoot(container).render(
    <StrictMode>
      <MockPanel />
    </StrictMode>
  )
}
