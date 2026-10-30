import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { Providers } from "@/app/providers"
import { setNetworkReady } from "@/lib/network-ready"

if (import.meta.env.VITE_ENABLE_MOCKS === "true") {
  setNetworkReady(
    import("@/mocks/start").then(({ startMocks }) => startMocks())
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers />
  </StrictMode>
)
