import type { Page } from "@playwright/test"

import { login } from "./fixtures/auth.ts"
import { expect, test } from "./fixtures/mocks.ts"

const EMERALD = "emerald-ape-042"
const IVORY_TEN = "ivory-baron-088-1-10"
const PRICE_NOTICE = "Emerald Ape #042 mudou de 1.19 para 1.29 ETH."

async function openCart(page: Page) {
  await login(page)
  await page.goto("/cart?panel=off")
  await expect(
    page
      .getByRole("complementary", { name: "Resumo da carteira" })
      .getByText("26.846 ETH")
  ).toBeVisible()
}

test("a price event updates the line and the summary, with a notice", async ({
  page,
  mocks,
}) => {
  await openCart(page)

  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })

  await expect(page.getByRole("status").getByText(PRICE_NOTICE)).toBeVisible()
  await expect(page.getByText("Preço alterado")).toBeVisible()
  await expect(
    page.getByText("2.58 ETH").filter({ visible: true })
  ).toBeVisible()
  await expect(page.getByText("27.046 ETH")).toBeVisible()

  await page.getByRole("button", { name: "Entendi" }).click()
  await expect(page.getByText(PRICE_NOTICE)).toBeHidden()
  await expect(page.getByText("Preço alterado")).toBeHidden()
  await expect(page.getByText("27.046 ETH")).toBeVisible()
})

test("a sold out event warns and blocks checkout", async ({ page, mocks }) => {
  await openCart(page)
  await expect(
    page.getByRole("link", { name: "Conectar e finalizar" })
  ).toBeVisible()

  await mocks.emit("nft.updated", "ivory-baron-088", {
    editionId: IVORY_TEN,
    available: 0,
  })

  await expect(
    page
      .getByRole("status")
      .getByText("Ivory Baron #088, edição 1/10, esgotou.")
  ).toBeVisible()
  await expect(page.getByText("Disponibilidade alterada")).toBeVisible()
  await expect(page.getByText(/^Esgotada/)).toBeVisible()

  const blocked = page.getByRole("button", { name: "Conectar e finalizar" })
  await expect(blocked).toHaveAttribute("aria-disabled", "true")
  await blocked.click({ force: true })
  await expect(page).toHaveURL(/\/cart/)
  await expect(page).not.toHaveURL(/checkout/)
})

test("a duplicate event does not repeat the notice", async ({
  page,
  mocks,
}) => {
  await openCart(page)

  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })
  await expect(page.getByText(PRICE_NOTICE)).toHaveCount(1)
  await page.getByRole("button", { name: "Entendi" }).click()
  await expect(page.getByText(PRICE_NOTICE)).toHaveCount(0)

  const nft = (await mocks.state()).nfts.find(({ id }) => id === EMERALD)
  const envelope = {
    eventId: "repeated",
    type: "nft.updated",
    resourceId: EMERALD,
    version: 100,
    data: { priceEth: "1.29", editions: nft?.editions },
  }
  await mocks.emitRaw(envelope)
  await mocks.emitRaw(envelope)
  await page.waitForTimeout(300)
  await expect(page.getByRole("status").getByText("mudou de")).toHaveCount(0)

  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.39" })
  await expect(
    page.getByText("Emerald Ape #042 mudou de 1.29 para 1.39 ETH.")
  ).toHaveCount(1)
})

test("a change made away from the cart shows when returning", async ({
  page,
  mocks,
}) => {
  await login(page)
  await page.goto("/?panel=off")
  await page
    .getByRole("link", { name: /^Carrinho/ })
    .filter({ visible: true })
    .click()
  await expect(page.getByText("26.846 ETH")).toBeVisible()

  await page.goBack()
  await expect(page).not.toHaveURL(/\/cart/)
  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })

  await page.goForward()
  await expect(page.getByText(PRICE_NOTICE)).toBeVisible()
  await expect(page.getByText("27.046 ETH")).toBeVisible()
})

test("a change before the first visit to the cart shows the notice", async ({
  page,
  mocks,
}) => {
  await login(page)
  await page.goto("/?panel=off")
  const cartLink = page
    .getByRole("link", { name: /^Carrinho/ })
    .filter({ visible: true })
  await expect(cartLink).toHaveAccessibleName("Carrinho, 17 itens")

  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })
  await cartLink.click()

  await expect(page.getByText(PRICE_NOTICE)).toBeVisible()
  await expect(page.getByText("Preço alterado")).toBeVisible()
  await expect(page.getByText("27.046 ETH")).toBeVisible()
})

test("a shortage notice follows the latest availability", async ({
  page,
  mocks,
}) => {
  await openCart(page)

  for (const available of [3, 5]) {
    await mocks.emit("nft.updated", "ivory-baron-088", {
      editionId: IVORY_TEN,
      available,
    })
    await expect(
      page
        .getByRole("status")
        .getByText(`Ivory Baron #088, edição 1/10: só restam ${available}.`)
    ).toBeVisible()
  }

  await expect(page.getByText(/só restam 3/)).toHaveCount(0)
})

test("a shortage notice leaves once it is resolved", async ({
  page,
  mocks,
}) => {
  await openCart(page)

  await mocks.emit("nft.updated", "ivory-baron-088", {
    editionId: IVORY_TEN,
    available: 3,
  })
  const notice = "Ivory Baron #088, edição 1/10: só restam 3."
  await expect(page.getByRole("status").getByText(notice)).toBeVisible()

  await page.getByRole("button", { name: "Ajustar para 3" }).click()

  await expect(page.getByText(notice)).toHaveCount(0)
  await expect(
    page.getByRole("status", { name: /^Quantidade de Ivory Baron/ })
  ).toHaveText("3")
  await expect(
    page.getByRole("link", { name: "Conectar e finalizar" })
  ).toBeVisible()
})

test("a failed refresh warns and blocks checkout until it recovers", async ({
  page,
  mocks,
}) => {
  await openCart(page)

  await mocks.scenario("server-error")
  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })

  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível atualizar o carrinho",
    { timeout: 15_000 }
  )
  const blocked = page.getByRole("button", { name: "Conectar e finalizar" })
  await expect(blocked).toHaveAttribute("aria-disabled", "true")

  await mocks.scenario("default")
  await page.getByRole("button", { name: "Tentar novamente" }).click()

  await expect(page.getByText(PRICE_NOTICE)).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Conectar e finalizar" })
  ).toBeVisible()
})

test("an unread notice is still there after leaving the cart", async ({
  page,
  mocks,
}) => {
  await openCart(page)
  await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })
  await expect(page.getByText(PRICE_NOTICE)).toBeVisible()

  await page.getByRole("article").first().getByRole("link").click()
  await expect(page).toHaveURL(/\/nft\//)
  await page.goBack()

  await expect(page.getByText(PRICE_NOTICE)).toBeVisible()
})
