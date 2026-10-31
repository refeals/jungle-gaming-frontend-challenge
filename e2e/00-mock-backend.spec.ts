import type { Page } from "@playwright/test"

import { expect, test, waitForMocks } from "./fixtures/mocks.ts"

const PASSWORD = "Kurio@123"
const COLLECTOR = "collector@kurio.test"
const SECOND = "second@kurio.test"
const COLLECTOR_WALLET = "wallet-collector-primary"
const STORAGE_KEY = "kurio.mock.v3"
const APP_CONNECTIONS = 1

const collectorDetails = {
  displayName: "Colecionador Kurio",
  username: "collector",
  email: COLLECTOR,
  profileName: "collector",
  ensName: null,
  secondaryAddress: null,
  referralCode: null,
  note: null,
}

type ApiOptions = {
  method?: string
  body?: unknown
  token?: string
  headers?: Record<string, string>
}

async function api(page: Page, path: string, options: ApiOptions = {}) {
  return page.evaluate(
    async ({ path, options }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
      }
      if (options.token) headers.Authorization = `Bearer ${options.token}`

      const response = await fetch(`/api${path}`, {
        method: options.method ?? "GET",
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { path, options }
  )
}

async function login(page: Page, email: string) {
  const { status, body } = await api(page, "/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD },
  })
  expect(status).toBe(200)
  return body.token as string
}

async function prepareOrder(page: Page, token: string) {
  await api(page, `/wallets/${COLLECTOR_WALLET}/connect`, {
    method: "POST",
    token,
    body: { network: "ethereum" },
  })
  const quote = await api(page, "/quotes", {
    method: "POST",
    token,
    body: { network: "ethereum" },
  })
  expect(quote.status).toBe(201)
  return {
    quoteId: quote.body.quoteId as string,
    walletId: COLLECTOR_WALLET,
    collector: collectorDetails,
  }
}

function postOrder(page: Page, token: string, key: string, body: unknown) {
  return api(page, "/orders", {
    method: "POST",
    token,
    body,
    headers: { "Idempotency-Key": key },
  })
}

function waitForStatus(page: Page, token: string, id: string, status: string) {
  return expect
    .poll(
      async () => (await api(page, `/orders/${id}`, { token })).body.status,
      {
        timeout: 8000,
      }
    )
    .toBe(status)
}

test.skip(
  ({ viewport }) => (viewport?.width ?? 0) < 768,
  "viewport-independent"
)

test("login accepts valid credentials and rejects invalid ones", async ({
  page,
}) => {
  const valid = await api(page, "/auth/login", {
    method: "POST",
    body: { email: COLLECTOR, password: PASSWORD },
  })
  expect(valid.status).toBe(200)
  expect(valid.body.token).toBeTruthy()
  expect(valid.body.user).not.toHaveProperty("passwordHash")

  const invalid = await api(page, "/auth/login", {
    method: "POST",
    body: { email: COLLECTOR, password: "senha-errada" },
  })
  expect(invalid.status).toBe(401)
  expect(invalid.body.error.code).toBe("invalid_credentials")
})

test("register rejects a taken e-mail and never stores the password", async ({
  page,
}) => {
  const body = {
    username: "nova",
    email: "nova@kurio.test",
    password: "Senha@Segura1",
    confirmPassword: "Senha@Segura1",
  }
  expect(
    (await api(page, "/auth/register", { method: "POST", body })).status
  ).toBe(201)

  const conflict = await api(page, "/auth/register", { method: "POST", body })
  expect(conflict.status).toBe(409)
  expect(conflict.body.error.code).toBe("email_taken")
  expect(conflict.body.error.fields.email).toBeTruthy()

  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY
  )
  expect(stored).not.toContain("Senha@Segura1")
  expect(stored).not.toContain(PASSWORD)
})

test("private routes require a session", async ({ page }) => {
  const response = await api(page, "/orders/qualquer")
  expect(response.status).toBe(401)
  expect(response.body.error.code).toBe("session_invalid")
})

test("catalog combines filters, sorts and computes facets", async ({
  page,
}) => {
  const { status, body } = await api(
    page,
    "/nfts?collection=digital-art&network=ethereum&sort=price-asc&page=1"
  )
  expect(status).toBe(200)
  expect(body.items.length).toBeGreaterThan(0)
  expect(body.items.length).toBeLessThanOrEqual(9)

  for (const nft of body.items) {
    expect(nft.category).toBe("digital-art")
    expect(nft.network).toBe("ethereum")
    expect(typeof nft.priceEth).toBe("string")
  }

  const prices = body.items.map((nft: { priceEth: string }) => nft.priceEth)
  expect(prices[0]).toBe("0.02")

  const ethereum = body.facets.networks.find(
    (facet: { value: string }) => facet.value === "ethereum"
  )
  expect(ethereum.count).toBe(body.totalItems)

  const polygon = body.facets.networks.find(
    (facet: { value: string }) => facet.value === "polygon"
  )
  expect(polygon.count).toBeGreaterThanOrEqual(0)

  const empty = await api(page, "/nfts?q=nao-existe-nada")
  expect(empty.body.items).toEqual([])
  expect(empty.body.totalPages).toBe(0)

  const missing = await api(page, "/nfts/nao-existe")
  expect(missing.status).toBe(404)
  expect(missing.body.error.code).toBe("not_found")
})

test("cart totals keep decimal precision and validate coupons", async ({
  page,
}) => {
  const token = await login(page, COLLECTOR)
  const cart = await api(page, "/cart", { token })
  expect(cart.body.summary).toEqual({
    subtotalEth: "26.83",
    discountEth: "0",
    feeEth: "0.016",
    totalEth: "26.846",
  })

  const invalid = await api(page, "/cart/coupon", {
    method: "PUT",
    token,
    body: { code: "NOPE" },
  })
  expect(invalid.status).toBe(422)
  expect(invalid.body.error.code).toBe("coupon_invalid")

  const expired = await api(page, "/cart/coupon", {
    method: "PUT",
    token,
    body: { code: "EXPIRED10" },
  })
  expect(expired.body.error.code).toBe("coupon_expired")

  const valid = await api(page, "/cart/coupon", {
    method: "PUT",
    token,
    body: { code: "kurio10" },
  })
  expect(valid.body.couponCode).toBe("KURIO10")
  expect(valid.body.summary.discountEth).toBe("2.683")
  expect(valid.body.summary.totalEth).toBe("24.163")
})

test("guest cart merges on login, respecting the limit", async ({ page }) => {
  const guest = await api(page, "/cart/items", {
    method: "POST",
    body: {
      nftId: "emerald-ape-042",
      editionId: "emerald-ape-042-1-50",
      quantity: 9,
    },
  })
  expect(guest.status).toBe(201)
  const guestCartId = guest.body.id as string

  const overLimit = await api(page, "/cart/items", {
    method: "POST",
    headers: { "X-Cart-Id": guestCartId },
    body: {
      nftId: "emerald-ape-042",
      editionId: "emerald-ape-042-1-50",
      quantity: 2,
    },
  })
  expect(overLimit.status).toBe(409)
  expect(overLimit.body.error.code).toBe("availability_conflict")

  const token = await login(page, COLLECTOR)
  const merged = await api(page, "/cart/merge", {
    method: "POST",
    token,
    body: { guestCartId },
  })
  expect(merged.status).toBe(200)
  expect(merged.body.adjustments).toEqual([
    {
      nftId: "emerald-ape-042",
      editionId: "emerald-ape-042-1-50",
      name: "Emerald Ape #042",
      requestedQuantity: 11,
      appliedQuantity: 10,
    },
  ])

  const repeated = await api(page, "/cart/merge", {
    method: "POST",
    token,
    body: { guestCartId },
  })
  expect(repeated.body.adjustments).toEqual([])
})

test("cart item of another owner is forbidden", async ({ page }) => {
  const token = await login(page, SECOND)
  const response = await api(page, "/cart/items/cart-item-1", {
    method: "DELETE",
    token,
  })
  expect(response.status).toBe(403)
})

test("order creation is idempotent", async ({ page }) => {
  const token = await login(page, COLLECTOR)
  const body = await prepareOrder(page, token)

  const missingKey = await api(page, "/orders", {
    method: "POST",
    token,
    body,
  })
  expect(missingKey.status).toBe(400)

  const first = await postOrder(page, token, "key-1", body)
  expect(first.status).toBe(201)
  expect(first.body.status).toBe("pending")

  const replay = await postOrder(page, token, "key-1", body)
  expect(replay.status).toBe(200)
  expect(replay.body.id).toBe(first.body.id)

  const conflict = await postOrder(page, token, "key-1", {
    ...body,
    collector: { ...collectorDetails, note: "outro conteúdo" },
  })
  expect(conflict.status).toBe(409)
  expect(conflict.body.error.code).toBe("idempotency_conflict")
})

test("order rejects a stale quote and an unconnected wallet", async ({
  page,
}) => {
  const token = await login(page, COLLECTOR)
  const body = await prepareOrder(page, token)

  await page.evaluate((key) => {
    const db = JSON.parse(localStorage.getItem(key)!)
    db.nfts.find(
      (nft: { id: string }) => nft.id === "emerald-ape-042"
    ).priceEth = "2.00"
    localStorage.setItem(key, JSON.stringify(db))
  }, STORAGE_KEY)

  const stale = await postOrder(page, token, "key-stale", body)
  expect(stale.status).toBe(409)
  expect(stale.body.error.code).toBe("quote_stale")
  expect(stale.body.error.details.quote.subtotalEth).toBe("28.45")
  expect(stale.body.error.details.quote).not.toHaveProperty("userId")

  await api(page, `/wallets/${COLLECTOR_WALLET}/disconnect`, {
    method: "POST",
    token,
  })
  const disconnected = await postOrder(page, token, "key-wallet", {
    ...body,
    quoteId: stale.body.error.details.quote.quoteId,
  })
  expect(disconnected.status).toBe(409)
  expect(disconnected.body.error.code).toBe("wallet_not_connected")
})

test("orders are isolated between users", async ({ page }) => {
  const collector = await login(page, COLLECTOR)
  const order = await postOrder(
    page,
    collector,
    "key-iso",
    await prepareOrder(page, collector)
  )

  const second = await login(page, SECOND)
  const response = await api(page, `/orders/${order.body.id}`, {
    token: second,
  })
  expect(response.status).toBe(403)

  const wallets = await api(page, "/wallets", { token: second })
  expect(wallets.body.map((wallet: { id: string }) => wallet.id)).toEqual([
    "wallet-second-primary",
  ])

  const foreignWallet = await api(
    page,
    `/wallets/${COLLECTOR_WALLET}/connect`,
    {
      method: "POST",
      token: second,
      body: { network: "ethereum" },
    }
  )
  expect(foreignWallet.status).toBe(403)
})

test("confirmed order removes only what was bought and keeps its receipt", async ({
  page,
}) => {
  const token = await login(page, COLLECTOR)
  const created = await postOrder(
    page,
    token,
    "key-confirm",
    await prepareOrder(page, token)
  )
  const orderId = created.body.id as string

  await api(page, "/cart/items", {
    method: "POST",
    token,
    body: {
      nftId: "golden-beat-207",
      editionId: "golden-beat-207-1-50",
      quantity: 1,
    },
  })

  await waitForStatus(page, token, orderId, "confirmed")

  const cart = await api(page, "/cart", { token })
  expect(cart.body.items.map((item: { nftId: string }) => item.nftId)).toEqual([
    "golden-beat-207",
  ])

  const before = await api(page, `/orders/${orderId}`, { token })
  expect(before.body.transactionRef).toMatch(/^0x[0-9a-f]{64}$/)
  expect(before.body.snapshot.totalEth).toBe("26.846")

  await page.evaluate((key) => {
    const db = JSON.parse(localStorage.getItem(key)!)
    db.nfts.find(
      (nft: { id: string }) => nft.id === "emerald-ape-042"
    ).priceEth = "99.00"
    localStorage.setItem(key, JSON.stringify(db))
  }, STORAGE_KEY)

  const after = await api(page, `/orders/${orderId}`, { token })
  expect(after.body.snapshot).toEqual(before.body.snapshot)
})

test("pending order settles after a reload", async ({ page }) => {
  const token = await login(page, COLLECTOR)
  const created = await postOrder(
    page,
    token,
    "key-reload",
    await prepareOrder(page, token)
  )
  expect(created.body.status).toBe("pending")

  await page.reload()
  await waitForMocks(page)

  await waitForStatus(page, token, created.body.id, "confirmed")
})

test("changes persist after a reload", async ({ page }) => {
  const token = await login(page, COLLECTOR)
  await api(page, "/favorites/golden-beat-207", { method: "PUT", token })
  await api(page, "/profile", {
    method: "PATCH",
    token,
    body: {
      displayName: "Nome Novo",
      username: "collector",
      email: COLLECTOR,
      ensName: null,
      walletNickname: null,
    },
  })

  await page.reload()
  await waitForMocks(page)

  const favorites = await api(page, "/favorites", { token })
  expect(favorites.body.nftIds).toContain("golden-beat-207")
  const profile = await api(page, "/profile", { token })
  expect(profile.body.displayName).toBe("Nome Novo")
})

test("profile and wallet forms return field errors", async ({ page }) => {
  const token = await login(page, COLLECTOR)

  const wrongPassword = await api(page, "/profile/password", {
    method: "POST",
    token,
    body: {
      currentPassword: "errada-123",
      newPassword: "NovaSenha@1",
      confirmPassword: "NovaSenha@1",
    },
  })
  expect(wrongPassword.status).toBe(422)
  expect(wrongPassword.body.error.fields.currentPassword).toBeTruthy()

  const invalidWallet = await api(page, "/wallets", {
    method: "POST",
    token,
    body: { slot: "primary", address: "nao-e-endereco" },
  })
  expect(invalidWallet.status).toBe(422)
  expect(invalidWallet.body.error.fields.address).toBeTruthy()

  const secondToken = await login(page, SECOND)
  const taken = await api(page, "/wallets", {
    method: "POST",
    token: secondToken,
    body: {
      slot: "secondary",
      displayName: "Segunda Conta",
      nickname: "Outra",
      network: "polygon",
      profileName: "second",
      address: "0x1111111111111111111111111111111111111111",
      secondaryAddress: null,
      walletType: "metamask",
      referralCode: null,
      email: SECOND,
      ensName: null,
    },
  })
  expect(taken.status).toBe(409)
  expect(taken.body.error.code).toBe("wallet_address_taken")
})

async function openSocket(page: Page, name: string, token?: string) {
  await page.evaluate(
    async ({ name, token }) => {
      const scope = window as unknown as {
        __mocks: { createSocketClient(): Promise<SocketLike> }
        __sockets?: Record<string, SocketRecord>
      }
      const socket = await scope.__mocks.createSocketClient()
      const record: SocketRecord = {
        socket,
        events: [],
        disconnects: [],
        connects: 0,
      }
      scope.__sockets ??= {}
      scope.__sockets[name] = record
      socket.on("nft.updated", (event: unknown) => record.events.push(event))
      socket.on("order.updated", (event: unknown) => record.events.push(event))
      socket.on("disconnect", (reason: unknown) =>
        record.disconnects.push(reason)
      )
      await new Promise<void>((resolve) => {
        socket.on("connect", () => {
          record.connects += 1
          if (token) socket.emit("session.join", { token })
          resolve()
        })
        socket.connect()
      })
    },
    { name, token }
  )
}

type SocketLike = {
  on(event: string, listener: (payload: unknown) => void): void
  emit(event: string, payload: unknown): void
  connect(): void
}

type SocketRecord = {
  socket: SocketLike
  events: unknown[]
  disconnects: unknown[]
  connects: number
}

function socketRecord(page: Page, name: string) {
  return page.evaluate((key) => {
    const scope = window as unknown as {
      __sockets: Record<
        string,
        Omit<SocketRecord, "socket"> & { socket?: unknown }
      >
    }
    const { events, disconnects, connects } = scope.__sockets[key]
    return { events, disconnects, connects }
  }, name) as Promise<{
    events: { eventId: string; type: string; version: number }[]
    disconnects: string[]
    connects: number
  }>
}

test("reset restores the seed", async ({ page, mocks }) => {
  const seed = await mocks.state()
  const token = await login(page, COLLECTOR)
  await api(page, "/favorites/golden-beat-207", { method: "PUT", token })
  await mocks.scenario("slow")
  await mocks.reset()

  const restored = await mocks.state()
  const withoutClock = (state: typeof seed) => ({
    ...state,
    clock: { baseIso: state.clock.baseIso },
    sequence: 0,
    mock: { ...state.mock, connectionCount: 0 },
  })
  expect(withoutClock(restored)).toEqual(withoutClock(seed))
  expect(restored.mock.scenario).toBe("default")
})

test("state never exposes a plain password", async ({ mocks }) => {
  expect(JSON.stringify(await mocks.state())).not.toContain(PASSWORD)
})

test("real socket client receives nft.updated with its version", async ({
  page,
  mocks,
}) => {
  await openSocket(page, "client")
  await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "2.50" })

  await expect
    .poll(async () => (await socketRecord(page, "client")).events)
    .toEqual([
      expect.objectContaining({
        type: "nft.updated",
        eventId: expect.stringMatching(/^nft\.updated:emerald-ape-042:2-\d+$/),
        version: 2,
      }),
    ])

  const detail = await api(page, "/nfts/emerald-ape-042")
  expect(detail.body.priceEth).toBe("2.50")
  expect(detail.body.previousPriceEth).toBe("1.19")
})

test("mock heartbeat keeps the socket connected", async ({ page }) => {
  await page.clock.install()
  await page.reload()
  await waitForMocks(page)

  await openSocket(page, "client")
  await page.clock.runFor(60_000)

  const record = await socketRecord(page, "client")
  expect(record.disconnects).toEqual([])
  expect(record.connects).toBe(1)
})

test("order.updated reaches only its owner", async ({ page, mocks }) => {
  const owner = await login(page, COLLECTOR)
  const other = await login(page, SECOND)
  await openSocket(page, "owner", owner)
  await openSocket(page, "other", other)
  await openSocket(page, "anonymous")
  await expect
    .poll(async () => (await mocks.state()).mock.connectionCount)
    .toBe(APP_CONNECTIONS + 3)

  const created = await postOrder(
    page,
    owner,
    "key-socket",
    await prepareOrder(page, owner)
  )
  await waitForStatus(page, owner, created.body.id, "confirmed")

  const orderEvents = async (name: string) =>
    (await socketRecord(page, name)).events.filter(
      (event) => event.type === "order.updated"
    )

  await expect.poll(() => orderEvents("owner")).toHaveLength(1)
  expect(await orderEvents("other")).toEqual([])
  expect(await orderEvents("anonymous")).toEqual([])
})

test("dropped connection reconnects after restore", async ({ page, mocks }) => {
  await openSocket(page, "client")

  await mocks.dropConnection()
  await expect
    .poll(async () => (await socketRecord(page, "client")).disconnects)
    .toEqual(["transport close"])
  expect((await mocks.state()).mock.connectionBlocked).toBe(true)

  await page.waitForTimeout(1500)
  expect((await socketRecord(page, "client")).connects).toBe(1)

  await mocks.restoreConnection()
  await expect
    .poll(async () => (await socketRecord(page, "client")).connects, {
      timeout: 10_000,
    })
    .toBe(2)
})

test("emitRaw replays an envelope without touching the database", async ({
  page,
  mocks,
}) => {
  await openSocket(page, "client")
  const envelope = {
    eventId: "nft.updated:emerald-ape-042:1",
    type: "nft.updated",
    resourceId: "emerald-ape-042",
    version: 1,
    data: { priceEth: "0.01", editions: [] },
  }
  await mocks.emitRaw(envelope)
  await mocks.emitRaw(envelope)

  await expect
    .poll(async () => (await socketRecord(page, "client")).events)
    .toHaveLength(2)
  const detail = await api(page, "/nfts/emerald-ape-042")
  expect(detail.body.priceEth).toBe("1.19")
})

test.describe("scenarios", () => {
  test("empty-catalog returns no items", async ({ page, mocks }) => {
    await mocks.scenario("empty-catalog")
    const { body } = await api(page, "/nfts")
    expect(body.items).toEqual([])
    expect(body.totalItems).toBe(0)
  })

  test("slow delays every call by two seconds", async ({ page, mocks }) => {
    await mocks.scenario("slow")
    const elapsed = await page.evaluate(async () => {
      const start = performance.now()
      await fetch("/api/nfts")
      return performance.now() - start
    })
    expect(elapsed).toBeGreaterThanOrEqual(1900)
  })

  test("variable-latency follows a fixed sequence", async ({ page, mocks }) => {
    await mocks.scenario("variable-latency")
    const timings = await page.evaluate(async () => {
      const measured: number[] = []
      for (let index = 0; index < 2; index += 1) {
        const start = performance.now()
        await fetch("/api/nfts")
        measured.push(performance.now() - start)
      }
      return measured
    })
    expect(timings[0]).toBeGreaterThanOrEqual(150)
    expect(timings[1]).toBeGreaterThanOrEqual(750)
  })

  test("out-of-order answers the second search first", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("out-of-order")
    const order = await page.evaluate(async () => {
      const finished: string[] = []
      await Promise.all(
        ["first", "second"].map(async (q) => {
          await fetch(`/api/nfts?q=${q}`)
          finished.push(q)
        })
      )
      return finished
    })
    expect(order).toEqual(["second", "first"])
  })

  test("offline fails the connection and recovers", async ({ page, mocks }) => {
    await mocks.scenario("offline")
    const failed = await page.evaluate(() =>
      fetch("/api/nfts").then(
        () => "resolved",
        () => "rejected"
      )
    )
    expect(failed).toBe("rejected")

    await mocks.scenario("default")
    expect((await api(page, "/nfts")).status).toBe(200)
  })

  test("server-error answers 503 on reads only", async ({ page, mocks }) => {
    await mocks.scenario("server-error")
    const read = await api(page, "/nfts")
    expect(read.status).toBe(503)
    expect(read.body.error.code).toBe("service_unavailable")

    const write = await api(page, "/auth/login", {
      method: "POST",
      body: { email: COLLECTOR, password: PASSWORD },
    })
    expect(write.status).toBe(200)
  })

  test("session-expired ends the session once", async ({ page, mocks }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("session-expired")

    const expired = await api(page, "/session", { token })
    expect(expired.status).toBe(401)
    expect((await api(page, "/session", { token })).status).toBe(401)

    const fresh = await login(page, COLLECTOR)
    expect((await api(page, "/session", { token: fresh })).status).toBe(200)
  })

  test("forbidden blocks private resources, not the session", async ({
    page,
    mocks,
  }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("forbidden")
    expect((await api(page, "/profile", { token })).status).toBe(403)
    expect((await api(page, "/session", { token })).status).toBe(200)
  })

  test("register-conflict always answers 409", async ({ page, mocks }) => {
    await mocks.scenario("register-conflict")
    const response = await api(page, "/auth/register", {
      method: "POST",
      body: {
        username: "livre",
        email: "livre@kurio.test",
        password: "Senha@Segura1",
        confirmPassword: "Senha@Segura1",
      },
    })
    expect(response.status).toBe(409)
    expect(response.body.error.fields.email).toBeTruthy()
  })

  test("form-validation-error answers 422 with fields", async ({
    page,
    mocks,
  }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("form-validation-error")
    const response = await api(page, "/profile", {
      method: "PATCH",
      token,
      body: {
        displayName: "Nome",
        username: "collector",
        email: COLLECTOR,
        ensName: null,
        walletNickname: null,
      },
    })
    expect(response.status).toBe(422)
    expect(response.body.error.fields.displayName).toBeTruthy()
  })

  test("favorite-fails rejects the mutation and keeps the data", async ({
    page,
    mocks,
  }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("favorite-fails")
    const response = await api(page, "/favorites/golden-beat-207", {
      method: "PUT",
      token,
    })
    expect(response.status).toBe(503)

    const favorites = await api(page, "/favorites", { token })
    expect(favorites.status).toBe(200)
    expect(favorites.body.nftIds).not.toContain("golden-beat-207")
  })

  test("price-changed makes the open quote stale", async ({ page, mocks }) => {
    const token = await login(page, COLLECTOR)
    await openSocket(page, "client", token)
    await mocks.scenario("price-changed")

    const body = await prepareOrder(page, token)
    await expect
      .poll(async () => (await socketRecord(page, "client")).events.length)
      .toBe(1)

    const stale = await postOrder(page, token, "key-price", body)
    expect(stale.status).toBe(409)
    expect(stale.body.error.code).toBe("quote_stale")
    expect(stale.body.error.details.quote.subtotalEth).toBe("27.03")
  })

  test("edition-sold-out conflicts on order and is reported in the cart", async ({
    page,
    mocks,
  }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("edition-sold-out")

    const body = await prepareOrder(page, token)
    await expect
      .poll(async () => {
        const cart = await api(page, "/cart", { token })
        return cart.body.items[0].isSoldOut
      })
      .toBe(true)

    const conflict = await postOrder(page, token, "key-sold", body)
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe("availability_conflict")
    expect(conflict.body.error.details.items[0].availableQuantity).toBe(0)
  })

  test("order-timeout creates the order and a retry recovers it", async ({
    page,
    mocks,
  }) => {
    test.setTimeout(30_000)
    const token = await login(page, COLLECTOR)
    const body = await prepareOrder(page, token)
    await mocks.scenario("order-timeout")

    const timedOut = await page.evaluate(
      async ({ token, body }) => {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 1000)
        return fetch("/api/orders", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": "key-timeout",
          },
          body: JSON.stringify(body),
        }).then(
          () => "answered",
          () => "aborted"
        )
      },
      { token, body }
    )
    expect(timedOut).toBe("aborted")

    const orders = (await mocks.state()).orders as { id: string }[]
    expect(orders).toHaveLength(1)

    const retry = await postOrder(page, token, "key-timeout", body)
    expect(retry.status).toBe(200)
    expect(retry.body.id).toBe(orders[0].id)
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("payment-declined keeps the cart and releases the reservation", async ({
    page,
    mocks,
  }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("payment-declined")
    const created = await postOrder(
      page,
      token,
      "key-declined",
      await prepareOrder(page, token)
    )
    const edition = async () =>
      (await api(page, "/nfts/emerald-ape-042")).body.editions.find(
        (item: { id: string }) => item.id === "emerald-ape-042-1-50"
      ).available
    expect(await edition()).toBe(10)

    await waitForStatus(page, token, created.body.id, "declined")

    expect(await edition()).toBe(12)
    const cart = await api(page, "/cart", { token })
    expect(cart.body.items).toHaveLength(3)
    const order = await api(page, `/orders/${created.body.id}`, { token })
    expect(order.body.transactionRef).toBeNull()
  })

  test("payment-pending-long waits for a command", async ({ page, mocks }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("payment-pending-long")
    const created = await postOrder(
      page,
      token,
      "key-long",
      await prepareOrder(page, token)
    )

    await page.waitForTimeout(3500)
    const pending = await api(page, `/orders/${created.body.id}`, { token })
    expect(pending.body.status).toBe("pending")

    await mocks.settlePending("confirmed")
    const settled = await api(page, `/orders/${created.body.id}`, { token })
    expect(settled.body.status).toBe("confirmed")
  })

  test("wallet-rejected ends without connection", async ({ page, mocks }) => {
    const token = await login(page, COLLECTOR)
    await mocks.scenario("wallet-rejected")
    const response = await api(page, `/wallets/${COLLECTOR_WALLET}/connect`, {
      method: "POST",
      token,
      body: { network: "ethereum" },
    })
    expect(response.body.status).toBe("rejected")
    expect(response.body.network).toBeNull()
  })
})

test("?scenario= applies, leaves the URL and stays out of navigation", async ({
  page,
  mocks,
}) => {
  await page.goto("/?scenario=empty-catalog&panel=off")
  await waitForMocks(page)
  await expect.poll(() => new URL(page.url()).search).toBe("")
  expect((await mocks.state()).mock.scenario).toBe("empty-catalog")

  await page.getByRole("link", { name: "Entrar" }).click()
  await expect.poll(() => new URL(page.url()).search).toBe("?auth=login")
})

test("unknown ?scenario= is ignored", async ({ page, mocks }) => {
  await page.goto("/?scenario=nao-existe")
  await waitForMocks(page)
  expect((await mocks.state()).mock.scenario).toBe("default")
})

test("?panel=off hides the panel, including after a reload", async ({
  page,
}) => {
  const panel = page.getByRole("complementary", { name: "Painel de mocks" })
  await expect(panel).toHaveCount(0)
  await page.reload()
  await waitForMocks(page)
  await expect(panel).toHaveCount(0)

  await page.goto("/?panel=on")
  await expect(panel).toBeVisible()
})

test("panel changes the scenario and resets with confirmation", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=on")
  await waitForMocks(page)
  const toggle = page.getByRole("button", { name: /painel de mocks/ })
  await toggle.click()
  await page.getByLabel("Cenário", { exact: true }).selectOption("slow")
  expect((await mocks.state()).mock.scenario).toBe("slow")

  await page.getByRole("button", { name: "Restaurar seed" }).click()
  expect((await mocks.state()).mock.scenario).toBe("slow")
  await page.getByRole("button", { name: "Confirmar reset do seed" }).click()
  expect((await mocks.state()).mock.scenario).toBe("default")

  await page.keyboard.press("Escape")
  await expect(toggle).toBeFocused()
})

test("new cart items never reuse a seeded id", async ({ page }) => {
  const token = await login(page, COLLECTOR)
  const cart = await api(page, "/cart/items", {
    method: "POST",
    token,
    body: {
      nftId: "golden-beat-207",
      editionId: "golden-beat-207-1-50",
      quantity: 1,
    },
  })
  const ids = cart.body.items.map((item: { id: string }) => item.id)
  expect(new Set(ids).size).toBe(ids.length)

  const removed = await api(page, `/cart/items/${ids[0]}`, {
    method: "DELETE",
    token,
  })
  expect(removed.body.items).toHaveLength(ids.length - 1)
})

test("passwords with surrounding spaces keep working", async ({ page }) => {
  const password = " Senha@Segura1 "
  const registered = await api(page, "/auth/register", {
    method: "POST",
    body: {
      username: "espaco",
      email: "espaco@kurio.test",
      password,
      confirmPassword: password,
    },
  })
  expect(registered.status).toBe(201)

  const loggedIn = await api(page, "/auth/login", {
    method: "POST",
    body: { email: "espaco@kurio.test", password },
  })
  expect(loggedIn.status).toBe(200)

  const changed = await api(page, "/profile/password", {
    method: "POST",
    token: loggedIn.body.token,
    body: {
      currentPassword: password,
      newPassword: "NovaSenha@1",
      confirmPassword: "NovaSenha@1",
    },
  })
  expect(changed.status).toBe(204)
})

test("logout stops order.updated on an open connection", async ({
  page,
  mocks,
}) => {
  const token = await login(page, COLLECTOR)
  await openSocket(page, "client", token)
  await expect
    .poll(async () => (await mocks.state()).mock.connectionCount)
    .toBe(APP_CONNECTIONS + 1)

  const created = await postOrder(
    page,
    token,
    "key-logout",
    await prepareOrder(page, token)
  )
  await api(page, "/auth/logout", { method: "POST", token })
  await mocks.settlePending("confirmed")

  const orders = (await mocks.state()).orders as {
    id: string
    status: string
  }[]
  expect(orders.find((order) => order.id === created.body.id)?.status).toBe(
    "confirmed"
  )
  await page.waitForTimeout(200)
  const events = (await socketRecord(page, "client")).events
  expect(events.filter((event) => event.type === "order.updated")).toEqual([])
})

test("changing a wallet network disconnects it, and casing does not", async ({
  page,
}) => {
  const token = await login(page, COLLECTOR)
  const wallets = await api(page, "/wallets", { token })
  const wallet = wallets.body.find(
    (item: { id: string }) => item.id === COLLECTOR_WALLET
  )
  const { id, status, connectedNetwork, ...fields } = wallet
  expect([id, status, connectedNetwork]).toEqual([
    COLLECTOR_WALLET,
    "disconnected",
    null,
  ])

  const connect = () =>
    api(page, `/wallets/${COLLECTOR_WALLET}/connect`, {
      method: "POST",
      token,
      body: { network: "ethereum" },
    })
  const patch = (body: object) =>
    api(page, `/wallets/${COLLECTOR_WALLET}`, { method: "PATCH", token, body })

  await connect()
  const sameAddress = await patch({
    ...fields,
    address: "0xABCDEF1111111111111111111111111111111111",
  })
  expect(sameAddress.body.status).toBe("disconnected")

  await connect()
  const casing = await patch({
    ...fields,
    address: "0xabcdef1111111111111111111111111111111111",
  })
  expect(casing.body.status).toBe("connected")

  const network = await patch({
    ...fields,
    address: "0xabcdef1111111111111111111111111111111111",
    network: "polygon",
  })
  expect(network.body.status).toBe("disconnected")
  expect(network.body.connectedNetwork).toBeNull()
})

test("merge reports the quantity kept for a sold out edition", async ({
  page,
  mocks,
}) => {
  const guest = await api(page, "/cart/items", {
    method: "POST",
    body: {
      nftId: "emerald-ape-042",
      editionId: "emerald-ape-042-1-50",
      quantity: 1,
    },
  })
  await mocks.emit("nft.updated", "emerald-ape-042", {
    editionId: "emerald-ape-042-1-50",
    available: 0,
  })

  const token = await login(page, COLLECTOR)
  const merged = await api(page, "/cart/merge", {
    method: "POST",
    token,
    body: { guestCartId: guest.body.id },
  })
  expect(merged.body.adjustments).toEqual([
    {
      nftId: "emerald-ape-042",
      editionId: "emerald-ape-042-1-50",
      name: "Emerald Ape #042",
      requestedQuantity: 3,
      appliedQuantity: 2,
    },
  ])
  expect(merged.body.cart.items[0].quantity).toBe(2)
})

test("invalid console input keeps the database intact", async ({
  page,
  mocks,
}) => {
  const token = await login(page, COLLECTOR)

  const attempts = await page.evaluate(() => {
    const control = (
      window as unknown as {
        __mocks: {
          emit(type: string, id: string, data: object): void
          setClock(iso: string): void
          latency(ms: number): void
        }
      }
    ).__mocks
    const rejected = (action: () => void) => {
      try {
        action()
        return false
      } catch {
        return true
      }
    }
    return [
      rejected(() =>
        control.emit("nft.updated", "emerald-ape-042", { priceEth: 2.5 })
      ),
      rejected(() => control.setClock("2026-09-20")),
      rejected(() => control.latency(Number.NaN)),
    ]
  })
  expect(attempts).toEqual([true, true, true])

  expect((await api(page, "/session", { token })).status).toBe(200)
  expect((await mocks.state()).mock.latencyMs).toBe(0)
})

test("panel shows an order created while it is open", async ({ page }) => {
  await page.goto("/?panel=on")
  await waitForMocks(page)
  await page.getByRole("button", { name: /painel de mocks/ }).click()
  await expect(page.getByText("Pedidos pendentes: 0")).toBeVisible()

  const token = await login(page, COLLECTOR)
  await postOrder(page, token, "key-panel", await prepareOrder(page, token))

  await expect(page.getByText("Pedidos pendentes: 1")).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirmar" })).toBeEnabled()
})

test("session-expired ignores public routes", async ({ page, mocks }) => {
  const token = await login(page, COLLECTOR)
  await mocks.scenario("session-expired")

  expect((await api(page, "/nfts", { token })).status).toBe(200)
  expect((await api(page, "/session", { token })).status).toBe(401)
})

test("forbidden blocks a signed-in cart, not a guest one", async ({
  page,
  mocks,
}) => {
  const token = await login(page, COLLECTOR)
  await mocks.scenario("forbidden")

  expect((await api(page, "/cart", { token })).status).toBe(403)
  const coupon = await api(page, "/cart/coupon", {
    method: "PUT",
    token,
    body: { code: "KURIO10" },
  })
  expect(coupon.status).toBe(403)
  expect((await api(page, "/cart")).status).toBe(200)
})

test("wallet validates the optional address and ENS fields", async ({
  page,
}) => {
  const token = await login(page, COLLECTOR)
  const wallets = await api(page, "/wallets", { token })
  const wallet = wallets.body.find(
    (item: { id: string }) => item.id === COLLECTOR_WALLET
  )
  const patch = (change: object) =>
    api(page, `/wallets/${COLLECTOR_WALLET}`, {
      method: "PATCH",
      token,
      body: { ...wallet, ...change },
    })

  const invalid = await patch({ secondaryAddress: "abc" })
  expect(invalid.status).toBe(422)
  expect(invalid.body.error.fields.secondaryAddress).toContain("0x")

  expect((await patch({ ensName: "Nome Inválido" })).status).toBe(422)
  expect((await patch({ secondaryAddress: "kurio.eth" })).status).toBe(200)
})

test("session is checked before the body", async ({ page }) => {
  const calls: [string, string][] = [
    ["PATCH", "/profile"],
    ["PUT", "/profile/avatar"],
    ["POST", "/profile/password"],
    ["POST", "/wallets"],
    ["POST", "/quotes"],
    ["POST", "/cart/merge"],
    ["POST", "/cart/items"],
    ["PUT", "/cart/coupon"],
  ]
  for (const [method, path] of calls) {
    const response = await api(page, path, {
      method,
      token: "token-invalido",
      body: {},
    })
    expect(response.status, path).toBe(401)
  }
})

test("validation messages are in portuguese", async ({ page }) => {
  const token = await login(page, COLLECTOR)
  const quantity = await api(page, "/cart/items", {
    method: "POST",
    token,
    body: { nftId: "emerald-ape-042", editionId: "x", quantity: 0 },
  })
  expect(quantity.body.error.fields.quantity).toBe("Valor inválido")

  const network = await api(page, "/quotes", {
    method: "POST",
    token,
    body: { network: "btc" },
  })
  expect(network.body.error.fields.network).toBe("Valor inválido")

  const missing = await api(page, "/quotes", {
    method: "POST",
    token,
    body: {},
  })
  expect(missing.body.error.fields.network).toBe("Campo obrigatório")
})

test("event and order ids never repeat after a reset", async ({
  page,
  mocks,
}) => {
  await openSocket(page, "client")
  await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "2.50" })
  await mocks.reset()
  await expect
    .poll(async () => (await socketRecord(page, "client")).connects, {
      timeout: 10_000,
    })
    .toBe(2)
  await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "9.99" })

  await expect
    .poll(async () => (await socketRecord(page, "client")).events.length)
    .toBe(2)
  const { events } = await socketRecord(page, "client")
  expect(events[0].version).toBe(events[1].version)
  expect(events[0].eventId).not.toBe(events[1].eventId)
})

test("pending order still settles after the clock moves back", async ({
  page,
  mocks,
}) => {
  const token = await login(page, COLLECTOR)
  const created = await postOrder(
    page,
    token,
    "key-clock",
    await prepareOrder(page, token)
  )
  const { clock } = await mocks.state()
  const current =
    new Date(clock.baseIso).getTime() + Date.now() - clock.anchorMs!
  await mocks.setClock(new Date(current - 2000).toISOString())

  await expect
    .poll(
      async () => {
        const { orders } = await mocks.state()
        return (orders as { id: string; status: string }[]).find(
          (order) => order.id === created.body.id
        )?.status
      },
      { timeout: 10_000 }
    )
    .toBe("confirmed")
})

test("out-of-order does not spend its delay on the first load", async ({
  page,
  mocks,
}) => {
  await mocks.scenario("out-of-order")
  const elapsed = await page.evaluate(async () => {
    const start = performance.now()
    await fetch("/api/nfts")
    return performance.now() - start
  })
  expect(elapsed).toBeLessThan(1000)
})

test("unknown api route answers a json 404", async ({ page }) => {
  const response = await api(page, "/nao-existe")
  expect(response.status).toBe(404)
  expect(response.body.error.code).toBe("not_found")
})

test("ETH amounts accept at most 18 decimals", async ({ page, mocks }) => {
  const rejected = await page.evaluate(() => {
    try {
      ;(
        window as unknown as {
          __mocks: { emit(type: string, id: string, data: object): void }
        }
      ).__mocks.emit("nft.updated", "emerald-ape-042", {
        priceEth: "1.0000000000000000001",
      })
      return false
    } catch {
      return true
    }
  })
  expect(rejected).toBe(true)
  expect((await mocks.state()).mock.scenario).toBe("default")
})
