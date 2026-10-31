import { login, submitLogin } from "./fixtures/auth.ts"
import { field } from "./fixtures/checkout.ts"
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
