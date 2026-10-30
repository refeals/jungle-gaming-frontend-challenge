import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { Providers } from "@/app/providers"
import { setNetworkReady } from "@/lib/network-ready"

setNetworkReady(Promise.resolve())

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers />
  </StrictMode>
)
