import type { Page } from "@playwright/test"

import { login } from "./fixtures/auth.ts"
import { openReview, prepareCheckout, review } from "./fixtures/checkout.ts"
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

test.describe("checkout with a live quote", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
  })

  test("a price event requires confirming the new values", async ({
    page,
    mocks,
  }) => {
    await openReview(page)
    await mocks.latency(600)

    await mocks.emit("nft.updated", EMERALD, { priceEth: "1.29" })

    const buy = review(page).getByRole("button", { name: "Confirmar compra" })
    await expect(buy).toHaveAttribute("aria-disabled", "true")
    await expect(
      review(page).getByText("Valores mudaram. Atualize a cotação")
    ).toBeVisible()

    await expect(review(page).getByRole("alert")).toContainText(
      "de 1.19 ETH para 1.29 ETH"
    )
    await expect(review(page).getByRole("alert")).toContainText(
      "Total: de 26.846 ETH para 27.046 ETH"
    )
    await expect(buy).toHaveCount(0)
    await mocks.latency(0)

    await review(page)
      .getByRole("button", { name: "Confirmar novos valores" })
      .click()
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()

    await expect(page).toHaveURL(/\/orders\//)
    const { orders } = await mocks.state()
    expect(orders).toHaveLength(1)
    expect(orders[0].snapshot.totalEth).toBe("27.046")
  })

  test("an unrelated event does not touch the quote", async ({
    page,
    mocks,
  }) => {
    await openReview(page)
    const quoteIdOf = async () =>
      ((await mocks.state()) as unknown as { quotes: { quoteId: string }[] })
        .quotes[0].quoteId
    const before = await quoteIdOf()
    await mocks.latency(600)

    await mocks.emit("nft.updated", "sage-nomad-009", { priceEth: "9.99" })
    await page.waitForTimeout(200)

    const buy = review(page).getByRole("button", { name: "Confirmar compra" })
    expect(await buy.getAttribute("aria-disabled")).toBeNull()
    await page.waitForTimeout(900)
    expect(await quoteIdOf()).toBe(before)
  })

  test("price-changed answers quote_stale and asks to confirm again", async ({
    page,
    mocks,
  }) => {
    await openReview(page)
    await mocks.scenario("price-changed")

    await review(page).getByRole("button", { name: "Confirmar compra" }).click()

    await expect(review(page).getByRole("alert")).toContainText(
      "de 1.19 ETH para 1.29 ETH"
    )
    expect((await mocks.state()).orders).toHaveLength(0)

    await review(page)
      .getByRole("button", { name: "Confirmar novos valores" })
      .click()
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()

    await expect(page).toHaveURL(/\/orders\//)
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("edition-sold-out goes back to the cart with a notice", async ({
    page,
    mocks,
  }) => {
    await openReview(page)
    await mocks.scenario("edition-sold-out")

    await review(page).getByRole("button", { name: "Confirmar compra" }).click()

    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText(/Há itens sem disponibilidade/)).toBeVisible()
    expect((await mocks.state()).orders).toHaveLength(0)
  })

  test("an expired quote blocks the order until it is confirmed again", async ({
    page,
    mocks,
  }) => {
    await openReview(page)
    const { clock } = await mocks.state()
    const later = Date.parse(clock.baseIso) + 60 * 60 * 1000
    await mocks.setClock(new Date(later).toISOString())

    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await expect
      .poll(async () => (await mocks.state()).orders.length, { timeout: 1000 })
      .toBe(0)

    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page).toHaveURL(/\/orders\//)
    expect((await mocks.state()).orders).toHaveLength(1)
  })
})

test("an expired coupon explains itself in the cart", async ({
  page,
  mocks,
}) => {
  await openCart(page)
  await page.getByLabel("Código promocional").fill("KURIO10")
  await page.getByRole("button", { name: "Aplicar" }).click()
  await expect(page.getByText("KURIO10").first()).toBeVisible()

  const { coupons } = (await mocks.state()) as unknown as {
    coupons: { code: string; expiresAt: string }[]
  }
  const expiry = coupons.find(({ code }) => code === "KURIO10")?.expiresAt ?? ""
  await mocks.setClock(new Date(Date.parse(expiry) + 1000).toISOString())
  await login(page)
  await page.goto("/cart?panel=off")

  await expect(
    page.getByText("O cupom KURIO10 expirou e saiu do cálculo.")
  ).toBeVisible()
  await page.getByRole("button", { name: "Entendi" }).click()
  await expect(page.getByText(/expirou e saiu/)).toHaveCount(0)
})

test("the quote timer renews it after 5 minutes", async ({ page, mocks }) => {
  await page.clock.install()
  await login(page)
  await prepareCheckout(page)
  await openReview(page)
  const quoteIdOf = async () =>
    ((await mocks.state()) as unknown as { quotes: { quoteId: string }[] })
      .quotes[0].quoteId
  const before = await quoteIdOf()
  await mocks.latency(800)

  await page.clock.fastForward("05:01")

  await expect(
    review(page).getByRole("button", { name: "Confirmar compra" })
  ).toHaveAttribute("aria-disabled", "true")
  await mocks.latency(0)
  await expect.poll(quoteIdOf).not.toBe(before)
  await expect(review(page).getByText(/A cotação foi renovada/)).toBeVisible()
  expect((await mocks.state()).orders).toHaveLength(0)
})
