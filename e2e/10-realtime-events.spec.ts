import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures/mocks.ts"

const NFT_ID = "emerald-ape-042"
const DETAIL = `/nft/${NFT_ID}?panel=off`

type Mocks = Parameters<Parameters<typeof test>[2]>[0]["mocks"]

async function waitForSocket(mocks: Mocks) {
  await expect
    .poll(async () => (await mocks.state()).mock.connectionCount)
    .toBeGreaterThan(0)
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
  overrides: { eventId: string; version: number; priceEth: string }
) {
  const nft = (await mocks.state()).nfts.find((item) => item.id === NFT_ID)
  return {
    type: "nft.updated",
    resourceId: NFT_ID,
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

test("repeated eventId is ignored even with a higher version", async ({
  page,
  mocks,
}) => {
  await page.goto(DETAIL)
  await expect(visibleText(page, "1.19 ETH")).toBeVisible()
  await waitForSocket(mocks)

  await mocks.emitRaw(
    await createEnvelope(mocks, {
      eventId: "repeated",
      version: 50,
      priceEth: "5.00",
    })
  )
  await expect(visibleText(page, "5.00 ETH")).toBeVisible()

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
    })
  )

  await expect(visibleText(page, "8.00 ETH")).toBeVisible()
  await expect(priceNotice(page, "6.00")).toHaveCount(0)
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

test("failed background refetch keeps the loaded content", async ({
  page,
  mocks,
}) => {
  await page.goto(DETAIL)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042"
  )
  await waitForSocket(mocks)

  await mocks.scenario("server-error")
  await mocks.dropConnection()
  await expect(page.getByText("Reconectando...")).toBeVisible()
  await mocks.restoreConnection()
  await expect(page.getByText("Reconectando...")).toBeHidden({
    timeout: 15_000,
  })
  await page.waitForTimeout(4000)

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
