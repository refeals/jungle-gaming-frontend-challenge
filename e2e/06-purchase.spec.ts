import { login, submitLogin } from "./fixtures/auth.ts"
import {
  field,
  openReview,
  prepareCheckout,
  review,
} from "./fixtures/checkout.ts"
import { expect, test } from "./fixtures/mocks.ts"

const IVORY_TEN = "ivory-baron-088-1-10"

test.describe("checkout entry", () => {
  test("an empty cart goes back to the cart", async ({ page }) => {
    await login(page, { email: "second@kurio.test", password: "Kurio@123" })
    await page.goto("/cart?panel=off")
    await page.getByRole("button", { name: /^Remover / }).click()
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible()

    await page.goto("/checkout?panel=off")

    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible()
  })

  test("a sold out item goes back to the cart with a notice", async ({
    page,
    mocks,
  }) => {
    await login(page)
    await mocks.emit("nft.updated", "ivory-baron-088", {
      editionId: IVORY_TEN,
      available: 0,
    })

    await page.goto("/checkout?panel=off")

    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText(/Há itens sem disponibilidade/)).toBeVisible()
  })

  test("a positive control reaches the form", async ({ page }) => {
    await login(page)
    await page.goto("/checkout?panel=off")
    await expect(field(page, "Nome de exibição")).toBeVisible()
    await expect(page).toHaveURL(/\/checkout/)
  })

  test("login with redirect also revalidates the cart", async ({
    page,
    mocks,
  }) => {
    await mocks.emit("nft.updated", "ivory-baron-088", {
      editionId: IVORY_TEN,
      available: 0,
    })
    await page.goto("/?auth=login&redirect=/checkout")
    await submitLogin(page, {
      email: "collector@kurio.test",
      password: "Kurio@123",
    })

    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText(/Há itens sem disponibilidade/)).toBeVisible()
  })
})

test.describe("quote and pending order", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
  })

  test("the network sets the fee shown in the review", async ({ page }) => {
    await field(page, "Rede").click()
    await page.getByRole("option", { name: "Polygon" }).click()
    await page.getByRole("button", { name: "Conectar carteira" }).click()
    await expect(page.getByText(/^Conectada: .* Polygon/)).toBeVisible()

    await openReview(page)

    await expect(review(page).getByText("0.002 ETH")).toBeVisible()
    await expect(review(page).getByText("26.832 ETH")).toBeVisible()
  })

  test("a pending order sends checkout to the order, without a new one", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("payment-pending-long")
    await openReview(page)
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page).toHaveURL(/\/orders\//)
    const { orders } = await mocks.state()

    await page.goto("/checkout?panel=off")

    await expect(page).toHaveURL(new RegExp(`/orders/${orders[0].id}`))
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("a line with a reservation can still be reduced", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("payment-pending-long")
    await openReview(page)
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page).toHaveURL(/\/orders\//)

    await page.goto("/cart?panel=off")
    await page
      .getByRole("button", { name: /^Diminuir quantidade de Ivory Baron/ })
      .click()

    await expect(
      page.getByRole("status", { name: /^Quantidade de Ivory Baron/ })
    ).toHaveText("8")
  })

  test("the reservation of a pending order is not shown as a shortage", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("payment-pending-long")
    await openReview(page)
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page).toHaveURL(/\/orders\//)

    await page.goto("/cart?panel=off")

    await expect(
      page.getByText(/reservado para o pedido/).first()
    ).toBeVisible()
    await expect(page.getByText(/^Esgotada/)).toHaveCount(0)
    await expect(page.getByText(/Só restam/)).toHaveCount(0)
    await expect(
      page.getByRole("link", { name: "Conectar e finalizar" })
    ).toBeVisible()
  })
})
