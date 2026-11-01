import type { Page } from "@playwright/test"

import { login, SECOND, submitLogin } from "./fixtures/auth.ts"
import { isMobile, placeOrder, receiptHeading } from "./fixtures/checkout.ts"
import { expect, test } from "./fixtures/mocks.ts"

const NFT_ID = "emerald-ape-042"
const DETAIL = `/nft/${NFT_ID}?panel=off`

type Mocks = Parameters<Parameters<typeof test>[2]>[0]["mocks"]

async function waitForSocket(mocks: Mocks) {
  await expect
    .poll(async () => (await mocks.state()).mock.connectionCount)
    .toBeGreaterThan(0)
}

async function flushEvents(page: Page, mocks: Mocks) {
  const cartRead = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === "/api/cart" &&
      request.method() === "GET"
  )
  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: `flush-${Date.now()}`,
      version: 1000,
      priceEth: "1.19",
      resourceId: "sage-nomad-009",
    })
  )
  await cartRead
}

function isOrderRead(url: string, orderId: string) {
  return new URL(url).pathname === `/api/orders/${orderId}`
}

function emeraldCard(page: Page) {
  return page.getByRole("article").filter({ hasText: "Emerald Ape #042" })
}

function visibleText(page: Page, text: string) {
  return page.getByText(text).locator("visible=true").first()
}

function priceNotice(page: Page, price: string) {
  return page.getByText(`Preço atualizado para ${price} ETH`)
}

async function createEnvelope(
  mocks: Mocks,
  overrides: {
    eventId: string
    version: number
    priceEth: string
    resourceId?: string
  }
) {
  const resourceId = overrides.resourceId ?? NFT_ID
  const nft = (await mocks.state()).nfts.find((item) => item.id === resourceId)
  return {
    type: "nft.updated",
    resourceId,
    eventId: overrides.eventId,
    version: overrides.version,
    data: { priceEth: overrides.priceEth, editions: nft?.editions ?? [] },
  }
}

test("emit updates the grid card without a reload", async ({ page, mocks }) => {
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await mocks.emit("nft.updated", NFT_ID, { priceEth: "2.50" })

  await expect(emeraldCard(page)).toContainText("2.50 ETH")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
})

test("emit updates the detail and announces the price", async ({
  page,
  mocks,
}) => {
  await page.goto(DETAIL)
  await expect(visibleText(page, "1.19 ETH")).toBeVisible()
  await waitForSocket(mocks)

  await mocks.emit("nft.updated", NFT_ID, { priceEth: "2.50" })

  await expect(visibleText(page, "2.50 ETH")).toBeVisible()
  await expect(priceNotice(page, "2.50")).toBeVisible()
})

test("availability event disables the edition", async ({ page, mocks }) => {
  await page.goto(DETAIL)
  const radio = page.getByRole("radio", { name: /^1\/10/ })
  await expect(radio).not.toHaveAttribute("aria-disabled", "true")
  await waitForSocket(mocks)

  await mocks.emit("nft.updated", NFT_ID, {
    editionId: `${NFT_ID}-1-10`,
    available: 0,
  })

  await expect(radio).toHaveAttribute("aria-disabled", "true")
  await expect(radio).toContainText("Esgotada")
})

test("an edition sold out while open shows a single notice", async ({
  page,
  mocks,
}) => {
  await page.goto(`${DETAIL}&edition=${NFT_ID}-1-10`)
  await expect(page.getByRole("radio", { name: /^1\/10/ })).toBeVisible()
  await waitForSocket(mocks)

  await page.evaluate(() => {
    const state = window as unknown as { replacedSeen?: boolean }
    new MutationObserver(() => {
      const text = document.body.textContent ?? ""
      if (text.includes("A edição pedida")) state.replacedSeen = true
    }).observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  })

  await mocks.emit("nft.updated", NFT_ID, {
    editionId: `${NFT_ID}-1-10`,
    available: 0,
  })

  await expect(page.getByText(/A edição 1\/10 esgotou/)).toBeVisible()
  await expect(page.getByText(/Mostrando a edição/)).toHaveCount(1)
  expect(
    await page.evaluate(
      () => (window as unknown as { replacedSeen?: boolean }).replacedSeen
    )
  ).toBeUndefined()

  await page.reload()
  await expect(page.getByText(/A edição pedida não está/)).toBeVisible()
  await expect(page.getByText(/A edição 1\/10 esgotou/)).toHaveCount(0)
})

test("repeated eventId is ignored even with a higher version", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "repeated",
      version: 50,
      priceEth: "5.00",
    })
  )
  await expect(emeraldCard(page)).toContainText("5.00 ETH")

  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "repeated",
      version: 51,
      priceEth: "6.00",
    })
  )
  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "sentinel",
      version: 52,
      priceEth: "8.00",
      resourceId: "sage-nomad-009",
    })
  )

  await expect(
    page.getByRole("article").filter({ hasText: "Sage Nomad" }).first()
  ).toContainText("8.00 ETH")
  await expect(emeraldCard(page)).toContainText("5.00 ETH")
  await expect(emeraldCard(page)).not.toContainText("6.00 ETH")
})

test("older version does not regress the price", async ({ page, mocks }) => {
  await page.goto(DETAIL)
  await expect(visibleText(page, "1.19 ETH")).toBeVisible()
  await waitForSocket(mocks)

  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "newer",
      version: 50,
      priceEth: "5.00",
    })
  )
  await expect(visibleText(page, "5.00 ETH")).toBeVisible()

  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "older",
      version: 49,
      priceEth: "4.00",
    })
  )
  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "sentinel-old",
      version: 51,
      priceEth: "8.00",
    })
  )

  await expect(visibleText(page, "8.00 ETH")).toBeVisible()
  await expect(priceNotice(page, "4.00")).toHaveCount(0)
})

test("rest response in flight does not regress a newer event", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await mocks.latency(1000)
  await page.getByRole("link", { name: "Novos lançamentos" }).click()
  await expect(page.getByText("Atualizando resultados")).toBeVisible()

  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "during-fetch",
      version: 50,
      priceEth: "7.77",
    })
  )

  await expect(page.getByText("Atualizando resultados")).toBeHidden({
    timeout: 10_000,
  })
  await expect(emeraldCard(page)).toContainText("7.77 ETH")
})

test("reconnection reconciles what was missed through rest", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await mocks.dropConnection()
  await expect(page.getByText("Reconectando...")).toBeVisible()

  await mocks.emit("nft.updated", NFT_ID, { priceEth: "3.33" })
  await page.waitForTimeout(300)
  await expect(emeraldCard(page)).toContainText("1.19 ETH")

  await mocks.restoreConnection()

  await expect(emeraldCard(page)).toContainText("3.33 ETH", {
    timeout: 15_000,
  })
  await expect(page.getByText("Reconectando...")).toBeHidden()
})

test("reset lets rest win over a higher cached version", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await mocks.emit("nft.updated", NFT_ID, { priceEth: "9.99" })
  await expect(emeraldCard(page)).toContainText("9.99 ETH")

  await mocks.reset()

  await expect(emeraldCard(page)).not.toContainText("9.99 ETH", {
    timeout: 15_000,
  })
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
})

test("navigating keeps a single connection", async ({ page, mocks }) => {
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toBeVisible()
  await waitForSocket(mocks)

  await emeraldCard(page).getByRole("link").click()
  await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
  await page.goBack()
  await expect(emeraldCard(page)).toBeVisible()

  expect((await mocks.state()).mock.connectionCount).toBe(1)
})

test("first connection failing still reconciles once it connects", async ({
  page,
  mocks,
}) => {
  await mocks.dropConnection()
  await page.goto("/?panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await expect(page.getByText("Reconectando...")).toBeVisible({
    timeout: 10_000,
  })

  await mocks.emit("nft.updated", NFT_ID, { priceEth: "4.44" })
  await mocks.restoreConnection()

  await expect(emeraldCard(page)).toContainText("4.44 ETH", {
    timeout: 15_000,
  })
  await expect(page.getByText("Reconectando...")).toBeHidden()
})

test("default edition selling out is announced", async ({ page, mocks }) => {
  await page.goto(DETAIL)
  await expect(page.getByRole("radio", { name: /^1\/1(?!0)/ })).toHaveAttribute(
    "aria-checked",
    "true"
  )
  await waitForSocket(mocks)

  await mocks.emit("nft.updated", NFT_ID, {
    editionId: `${NFT_ID}-1-1`,
    available: 0,
  })

  await expect(
    page.getByText("A edição 1/1 esgotou. Mostrando a edição 1/10.")
  ).toBeVisible()
  await expect(page.getByRole("radio", { name: /^1\/10/ })).toHaveAttribute(
    "aria-checked",
    "true"
  )
})

test("the socket still connects when the network setup outlasts the timeout", async ({
  page,
  mocks,
}) => {
  test.setTimeout(45_000)
  await page.addInitScript(() => {
    const { register } = ServiceWorkerContainer.prototype
    ServiceWorkerContainer.prototype.register = function (...args) {
      return new Promise((resolve) => setTimeout(resolve, 11_000)).then(() =>
        register.apply(this, args)
      )
    }
  })

  await page.goto("/?panel=off")

  await expect(page.getByText("Reconectando...")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText("Reconectando...")).toBeHidden({
    timeout: 15_000,
  })
  await waitForSocket(mocks)
})

test("failed background refetch keeps the loaded content", async ({
  page,
  mocks,
}) => {
  await page.goto(DETAIL)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042"
  )
  await waitForSocket(mocks)

  let failedReads = 0
  page.on("response", (response) => {
    const isDetail = new URL(response.url()).pathname === `/api/nfts/${NFT_ID}`
    if (isDetail && response.status() >= 500) failedReads += 1
  })
  await mocks.scenario("server-error")
  await mocks.dropConnection()
  await expect(page.getByText("Reconectando...")).toBeVisible()
  await mocks.restoreConnection()
  await expect(page.getByText("Reconectando...")).toBeHidden({
    timeout: 15_000,
  })
  await expect.poll(() => failedReads, { timeout: 15_000 }).toBe(3)

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042"
  )
  await expect(
    page.getByText("Não foi possível carregar este NFT")
  ).toBeHidden()
})

test("event on another nft keeps an inactive list invalidated", async ({
  page,
  mocks,
}) => {
  await page.goto("/?network=ethereum&sort=name&q=Emerald&panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await page.getByRole("link", { name: "Em alta" }).click()
  await expect(page).toHaveURL(/tab=trending/)

  await mocks.dropConnection()
  await expect(page.getByText("Reconectando...")).toBeVisible()
  await mocks.emit("nft.updated", NFT_ID, { priceEth: "9.00" })
  await mocks.restoreConnection()
  await expect(page.getByText("Reconectando...")).toBeHidden({
    timeout: 15_000,
  })
  await mocks.emit("nft.updated", "sage-nomad-009", { priceEth: "1.11" })

  await page.goBack()

  await expect(emeraldCard(page)).toContainText("9.00 ETH")
})

test("event on the listed nft keeps an inactive list invalidated", async ({
  page,
  mocks,
}) => {
  await page.goto("/?network=ethereum&sort=name&q=Emerald&panel=off")
  await expect(emeraldCard(page)).toContainText("1.19 ETH")
  await waitForSocket(mocks)

  await page.getByRole("link", { name: "Em alta" }).click()
  await expect(page).toHaveURL(/tab=trending/)

  await mocks.dropConnection()
  await expect(page.getByText("Reconectando...")).toBeVisible()
  await mocks.emit("nft.updated", NFT_ID, { priceEth: "9.00" })
  await mocks.restoreConnection()
  await expect(page.getByText("Reconectando...")).toBeHidden({
    timeout: 15_000,
  })
  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "after-reconnect",
      version: 2,
      priceEth: "5.55",
    })
  )

  await page.goBack()

  await expect(emeraldCard(page)).toContainText("9.00 ETH")
})

test("price notice does not move the content", async ({ page, mocks }) => {
  await page.goto(DETAIL)
  await expect(visibleText(page, "1.19 ETH")).toBeVisible()
  await waitForSocket(mocks)
  const edition = page.getByRole("radio", { name: /^1\/50/ })
  const before = await edition.boundingBox()

  await mocks.emit("nft.updated", NFT_ID, { priceEth: "2.50" })
  await expect(priceNotice(page, "2.50")).toBeVisible()

  expect((await edition.boundingBox())?.y).toBe(before?.y)
})

test.describe("order events", () => {
  test.beforeEach(async ({ page, mocks }) => {
    await login(page)
    await mocks.scenario("payment-pending-long")
    await placeOrder(page)
    await waitForSocket(mocks)
  })

  async function pendingOrderId(mocks: Mocks) {
    return (await mocks.state()).orders[0].id
  }

  test("a forged confirmed event never shows the receipt", async ({
    page,
    mocks,
  }) => {
    const id = await pendingOrderId(mocks)
    await page.evaluate(() => {
      const state = window as unknown as { receiptSeen?: boolean }
      new MutationObserver(() => {
        const text = document.body.textContent ?? ""
        if (text.includes("Seus NFTs agora estão")) state.receiptSeen = true
      }).observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    })
    const refetched = page.waitForResponse((response) =>
      isOrderRead(response.url(), id)
    )

    await mocks.emitRaw({
      type: "order.updated",
      resourceId: id,
      eventId: "forged",
      version: 99,
      data: { status: "confirmed", transactionRef: "0xforged" },
    })
    await refetched
    await flushEvents(page, mocks)

    expect(
      await page.evaluate(
        () => (window as unknown as { receiptSeen?: boolean }).receiptSeen
      )
    ).toBeUndefined()
    await expect(receiptHeading(page)).toHaveCount(0)
    await expect(
      page.getByRole("heading", { name: /em processamento/ })
    ).toBeVisible()
  })

  test("the real event brings the receipt from the api", async ({
    page,
    mocks,
  }) => {
    await mocks.settlePending("confirmed")

    await expect(receiptHeading(page)).toBeVisible({ timeout: 2000 })
    expect(
      await page.evaluate(() => localStorage.getItem("kurio.pendingOrderId"))
    ).toBeNull()
  })

  test("a duplicated event applies its effects once", async ({
    page,
    mocks,
  }) => {
    const id = await pendingOrderId(mocks)
    let orderReads = 0
    page.on("request", (request) => {
      if (isOrderRead(request.url(), id)) orderReads += 1
    })
    await mocks.latency(300)
    const envelope = {
      type: "order.updated",
      resourceId: id,
      eventId: "duplicated",
      version: 2,
      data: { status: "pending", transactionRef: null },
    }
    const firstRead = page.waitForResponse((response) =>
      isOrderRead(response.url(), id)
    )
    await mocks.emitRaw(envelope)
    await firstRead
    orderReads = 0

    const lastRead = page.waitForResponse((response) =>
      isOrderRead(response.url(), id)
    )
    await mocks.emitRaw(envelope)
    await mocks.emitRaw({ ...envelope, eventId: "sentinel" })
    await lastRead

    expect(orderReads).toBe(1)
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("an old event after a terminal state does not regress", async ({
    page,
    mocks,
  }) => {
    const id = await pendingOrderId(mocks)
    await mocks.settlePending("confirmed")
    await expect(receiptHeading(page)).toBeVisible({ timeout: 2000 })
    let orderReads = 0
    page.on("request", (request) => {
      if (isOrderRead(request.url(), id)) orderReads += 1
    })

    await mocks.emitRaw({
      type: "order.updated",
      resourceId: id,
      eventId: "old",
      version: 1,
      data: { status: "pending", transactionRef: null },
    })
    await flushEvents(page, mocks)

    expect(orderReads).toBe(0)
    await expect(receiptHeading(page)).toBeVisible()
  })

  test("a dropped connection recovers the settled order", async ({
    page,
    mocks,
  }) => {
    const id = await pendingOrderId(mocks)
    await mocks.dropConnection()
    await expect(page.getByText(/Sem conexão em tempo real/)).toBeVisible()

    await page.waitForResponse((response) => isOrderRead(response.url(), id), {
      timeout: 8000,
    })
    await mocks.settlePending("confirmed")
    await mocks.restoreConnection()

    await expect(receiptHeading(page)).toBeVisible({ timeout: 4000 })
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("polling finds the settled order without any event", async ({
    page,
    mocks,
  }) => {
    await mocks.dropConnection()
    await mocks.settlePending("confirmed")

    await expect(receiptHeading(page)).toBeVisible({ timeout: 8000 })
  })

  test("a reload keeps it pending, then recovers", async ({ page, mocks }) => {
    await page.reload()
    await expect(
      page.getByRole("heading", { name: /em processamento/ })
    ).toBeVisible()
    expect((await mocks.state()).orders).toHaveLength(1)

    await mocks.settlePending("declined")

    await expect(
      page.getByRole("heading", { name: "Pagamento recusado" })
    ).toBeVisible({ timeout: 8000 })
  })

  test("the global banner shows outside the order and leads to it", async ({
    page,
    mocks,
  }) => {
    const id = await pendingOrderId(mocks)
    await page.goto("/?panel=off")

    const banner = page.getByText("Você tem um pedido em processamento")
    await expect(banner).toBeVisible()
    await page.getByRole("link", { name: "Ver pedido" }).click()

    await expect(page).toHaveURL(new RegExp(`/orders/${id}`))
    await expect(banner).toHaveCount(0)
  })

  test("the banner leaves when the order settles elsewhere", async ({
    page,
    mocks,
  }) => {
    await page.goto("/?panel=off")
    await expect(
      page.getByText("Você tem um pedido em processamento")
    ).toBeVisible()

    await waitForSocket(mocks)
    await mocks.settlePending("confirmed")

    await expect(
      page.getByText("Você tem um pedido em processamento")
    ).toHaveCount(0, { timeout: 8000 })
    await expect(page.getByText("Seu pedido foi confirmado.")).toBeVisible()
  })
})

test("an order event of another user does not reach the session", async ({
  page,
  mocks,
}) => {
  await login(page)
  await mocks.scenario("payment-pending-long")
  await placeOrder(page)
  if (isMobile(page)) {
    await page.getByRole("link", { name: "Voltar ao catálogo" }).click()
    await page.getByRole("link", { name: "Perfil", exact: true }).click()
    await page.getByRole("button", { name: "Sair" }).click()
    await page.getByRole("link", { name: "Perfil", exact: true }).click()
  } else {
    await page.getByRole("button", { name: /^Menu da conta/ }).click()
    await page.getByRole("menuitem", { name: "Sair" }).click()
    await page.getByRole("link", { name: "Entrar" }).click()
  }
  await submitLogin(page, SECOND)
  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(
    page.getByText("Você tem um pedido em processamento")
  ).toHaveCount(0)

  await mocks.settlePending("confirmed")
  await flushEvents(page, mocks)

  await expect(page.getByText("Seu pedido foi confirmado.")).toHaveCount(0)
  expect((await mocks.state()).orders[0].status).toBe("confirmed")
})
