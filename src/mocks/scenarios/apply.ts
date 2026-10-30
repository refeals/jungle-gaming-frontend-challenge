import { delay, HttpResponse } from "msw"

import { add } from "@/mocks/db/money"
import { updateDb } from "@/mocks/db/store"
import { readBearerToken } from "@/mocks/http/auth"
import { fail, rejectSession } from "@/mocks/http/failure"
import type { ScenarioName } from "@/mocks/scenarios"
import { readConfig, updateConfig } from "@/mocks/scenarios/config"
import { dispatchEvents, type PendingEvent } from "@/mocks/services/events"
import { updateNft } from "@/mocks/services/nfts"

const SLOW_DELAY_MS = 2000
const VARIABLE_DELAYS_MS = [200, 800, 100, 1500, 400]
const OUT_OF_ORDER_DELAYS_MS = [1500, 100]
const DISRUPTION_DELAY_MS = 100
const ORDER_TIMEOUT_DELAY_MS = 11_000
const PENDING_LONG_DELAY_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_SETTLE_DELAY_MS = 3000
const PRICE_INCREASE_ETH = "0.10"

const PRIVATE_PATHS = [
  "/favorites",
  "/quotes",
  "/orders",
  "/profile",
  "/wallets",
  "/cart/merge",
]

let variableIndex = 0
let searchIndex = 0

export function resetSequences() {
  variableIndex = 0
  searchIndex = 0
}

function apiPath(request: Request) {
  return new URL(request.url).pathname.replace(/^\/api/, "")
}

function isPrivatePath(path: string) {
  return PRIVATE_PATHS.some((prefix) => path.startsWith(prefix))
}

function usesSession(path: string) {
  return !path.startsWith("/nfts") && !path.startsWith("/auth")
}

function scenarioDelay(request: Request) {
  const { scenario } = readConfig()

  if (scenario === "slow") return SLOW_DELAY_MS

  if (scenario === "variable-latency") {
    const value = VARIABLE_DELAYS_MS[variableIndex % VARIABLE_DELAYS_MS.length]
    variableIndex += 1
    return value
  }

  if (
    scenario === "out-of-order" &&
    request.method === "GET" &&
    apiPath(request) === "/nfts" &&
    new URL(request.url).searchParams.get("q")
  ) {
    const value = OUT_OF_ORDER_DELAYS_MS[searchIndex] ?? 0
    searchIndex += 1
    return value
  }

  return 0
}

function expireSession(token: string) {
  updateConfig({ consumed: true })
  updateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.token !== token)
  })
  rejectSession()
}

function disruptCart(token: string, scenario: ScenarioName) {
  const event = updateDb((db): PendingEvent | null => {
    const session = db.sessions.find((item) => item.token === token)
    const cart = db.carts.find((item) => item.userId === session?.userId)
    const target = cart?.items[0]
    if (!target) return null

    return updateNft(db, target.nftId, (nft) => {
      if (scenario === "price-changed") {
        nft.previousPriceEth = nft.priceEth
        nft.priceEth = add(nft.priceEth, PRICE_INCREASE_ETH)
        return
      }
      const edition = nft.editions.find((item) => item.id === target.editionId)
      if (edition) edition.available = 0
    })
  })

  if (!event) return
  updateConfig({ consumed: true })
  dispatchEvents([event])
}

function isCartDisruption() {
  const { scenario, consumed } = readConfig()
  return (
    !consumed &&
    (scenario === "price-changed" || scenario === "edition-sold-out")
  )
}

export async function beforeHandler(request: Request) {
  const { latencyMs } = readConfig()
  const waitMs = latencyMs + scenarioDelay(request)
  if (waitMs > 0) await delay(waitMs)

  const { scenario, consumed } = readConfig()
  const path = apiPath(request)
  const { method } = request
  const token = readBearerToken(request)

  if (scenario === "offline") return HttpResponse.error()

  if (scenario === "server-error" && method === "GET") {
    fail(503, "service_unavailable", "Serviço indisponível. Tente novamente.")
  }

  if (
    scenario === "session-expired" &&
    !consumed &&
    token &&
    usesSession(path)
  ) {
    expireSession(token)
  }

  if (
    scenario === "forbidden" &&
    (isPrivatePath(path) || (token && path.startsWith("/cart")))
  ) {
    fail(403, "forbidden", "Você não tem acesso a este recurso.")
  }

  if (
    scenario === "register-conflict" &&
    method === "POST" &&
    path === "/auth/register"
  ) {
    fail(409, "email_taken", "Este e-mail já está cadastrado.", {
      fields: { email: "Este e-mail já está cadastrado." },
    })
  }

  if (
    scenario === "form-validation-error" &&
    ((method === "PATCH" && path === "/profile") ||
      (method === "POST" && path === "/wallets") ||
      (method === "PATCH" && path.startsWith("/wallets/")))
  ) {
    fail(422, "validation_error", "Verifique os campos informados.", {
      fields: { displayName: "Este nome não pode ser usado." },
    })
  }

  if (
    scenario === "favorite-fails" &&
    path.startsWith("/favorites/") &&
    method !== "GET"
  ) {
    fail(503, "service_unavailable", "Serviço indisponível. Tente novamente.")
  }

  if (isCartDisruption() && token && method === "POST" && path === "/orders") {
    disruptCart(token, scenario)
  }

  return null
}

export async function afterHandler(request: Request, response: Response) {
  const { scenario, consumed } = readConfig()
  const path = apiPath(request)
  const token = readBearerToken(request)

  if (
    isCartDisruption() &&
    token &&
    response.status === 201 &&
    path === "/quotes"
  ) {
    updateConfig({ consumed: true })
    setTimeout(() => disruptCart(token, scenario), DISRUPTION_DELAY_MS)
  }

  if (
    scenario === "order-timeout" &&
    !consumed &&
    response.status === 201 &&
    path === "/orders"
  ) {
    updateConfig({ consumed: true })
    await delay(ORDER_TIMEOUT_DELAY_MS)
  }
}

export function isCatalogEmpty() {
  return readConfig().scenario === "empty-catalog"
}

export function isWalletRejected() {
  return readConfig().scenario === "wallet-rejected"
}

export function plannedOrderOutcome() {
  return readConfig().scenario === "payment-declined"
    ? ("declined" as const)
    : ("confirmed" as const)
}

export function settleDelayMs() {
  return readConfig().scenario === "payment-pending-long"
    ? PENDING_LONG_DELAY_MS
    : DEFAULT_SETTLE_DELAY_MS
}
