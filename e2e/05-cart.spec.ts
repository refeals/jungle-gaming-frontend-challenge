import type { Page } from "@playwright/test"

import {
  authDialog,
  COLLECTOR,
  login,
  SECOND,
  submitLogin,
} from "./fixtures/auth.ts"
import { expect, test, waitForMocks } from "./fixtures/mocks.ts"

const SAGE = "/nft/sage-nomad-009?panel=off"
const GUEST_CART_KEY = "kurio.guestCartId"
const IVORY_TEN = "/nft/ivory-baron-088?panel=off&edition=ivory-baron-088-1-10"

function buyButton(page: Page) {
  return page
    .getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/ })
    .filter({ visible: true })
}

async function logout(page: Page) {
  await page.goto("/profile?panel=off")
  await page
    .getByRole("button", { name: "Sair" })
    .filter({ visible: true })
    .click()
  await expect(page.getByText("Você saiu da sua conta.")).toBeVisible()
}

function storedGuestCartId(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), GUEST_CART_KEY)
}

async function buySage(page: Page) {
  await page.goto(SAGE)
  await waitForMocks(page)
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/cart/)
  await expect(
    cartLines(page).getByRole("heading", { name: /Sage Nomad/ })
  ).toBeVisible()
}

function cartLines(page: Page) {
  return page
    .locator("main")
    .getByRole("listitem")
    .filter({
      has: page.getByRole("button", { name: /^Remover/ }),
    })
}

test("buying from the detail adds and opens the cart", async ({
  page,
  viewport,
}) => {
  await buySage(page)

  await expect(cartLines(page)).toHaveCount(1)
  expect(await storedGuestCartId(page)).toMatch(/^guest-/)
  if ((viewport?.width ?? 0) >= 768) {
    await expect(
      page.getByRole("banner").getByRole("link", { name: /^Carrinho/ })
    ).toHaveAccessibleName("Carrinho, 1 item")
  }
})

test("two quick adds by a new guest keep both items", async ({
  page,
  mocks,
  viewport,
}) => {
  test.skip((viewport?.width ?? 0) < 768, "the card has no action on mobile")

  await page.goto("/?panel=off")
  await waitForMocks(page)
  await mocks.latency(600)

  for (const name of ["Sage Nomad #009", "Emerald Ape #042"]) {
    const card = page.getByRole("article").filter({ hasText: name })
    await card.hover()
    await card.getByRole("button", { name: /^Adicionar/ }).click()
  }

  await expect(
    page.getByRole("banner").getByRole("link", { name: /^Carrinho/ })
  ).toHaveAccessibleName("Carrinho, 2 itens", { timeout: 10_000 })
  await mocks.latency(0)
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(2)
})

test("the icon only adds, with a notice", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, "the card has no action on mobile")

  await page.goto("/?panel=off")
  const link = page.getByRole("banner").getByRole("link", { name: /^Carrinho/ })
  await expect(link).toHaveAccessibleName("Carrinho, 0 itens")

  const card = page.getByRole("article").filter({ hasText: "Sage Nomad #009" })
  await card.hover()
  await card.getByRole("button", { name: /^Adicionar/ }).click()

  await expect(page.getByText("adicionado ao carrinho.")).toBeVisible()
  await expect(link).toHaveAccessibleName("Carrinho, 1 item")
  await expect(card).toBeVisible()
  await expect(page).not.toHaveURL(/\/cart/)
})

test("the cart survives a refresh, as guest and as user", async ({ page }) => {
  await buySage(page)
  await page.reload()
  await expect(cartLines(page)).toHaveCount(1)

  await login(page)
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(4)
  await page.reload()
  await expect(cartLines(page)).toHaveCount(4)
})

test("the quantity respects the limit shown by the API", async ({ page }) => {
  await login(page)
  await page.goto("/cart?panel=off")

  const increase = page.getByRole("button", {
    name: /^Aumentar quantidade de Ivory Baron/,
  })
  const quantity = page.getByRole("status", {
    name: /^Quantidade de Ivory Baron/,
  })
  await expect(quantity).toHaveText("9")

  await increase.click()
  await expect(quantity).toHaveText("10")
  await expect(increase).toHaveAttribute("aria-disabled", "true")

  await increase.click({ force: true })
  await expect(page.getByText(/^Limite de 10/)).toBeVisible()
  await expect(quantity).toHaveText("10")

  await page
    .getByRole("button", { name: /^Diminuir quantidade de Ivory Baron/ })
    .click()
  await expect(quantity).toHaveText("9")
})

test("adding above the limit shows the API message and stays", async ({
  page,
}) => {
  await login(page)
  await page.goto(IVORY_TEN)
  await waitForMocks(page)

  const add = page.getByRole("button", {
    name: /^Aumentar quantidade/,
  })
  await add.filter({ visible: true }).click()
  await add.filter({ visible: true }).click()
  await buyButton(page).click()

  await expect(
    page.getByText("Quantidade acima da disponibilidade.")
  ).toBeVisible()
  await expect(page).toHaveURL(/\/nft\//)
})

test("removing then undoing restores the item", async ({ page }) => {
  await login(page)
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(3)

  await page.getByRole("button", { name: /^Remover Ivory Baron/ }).click()
  await expect(cartLines(page)).toHaveCount(2)
  await expect(
    page.getByText("Ivory Baron #088, edição 1/10, removido.")
  ).toBeVisible()

  await page.getByRole("button", { name: "Desfazer" }).click()
  await expect(cartLines(page)).toHaveCount(3)
  await expect(
    page.getByRole("status", { name: /^Quantidade de Ivory Baron/ })
  ).toHaveText("9")
})

test("an empty cart links to the catalog", async ({ page }) => {
  await page.goto("/cart?panel=off")

  await expect(page.getByText("Seu carrinho está vazio")).toBeVisible()
  await page.getByRole("link", { name: "Explorar o catálogo" }).click()
  await expect(page).toHaveURL(/#catalog$/)
})

test("guest items are kept after login, before the redirect", async ({
  page,
}) => {
  await buySage(page)

  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await expect(page).toHaveURL(/\/cart\?.*redirect=%2Fcheckout/)
  await submitLogin(page, COLLECTOR)

  await expect(page).toHaveURL(/\/checkout$/)
  expect(await storedGuestCartId(page)).toBeNull()

  await page.getByRole("link", { name: "Voltar ao carrinho" }).click()
  await expect(cartLines(page)).toHaveCount(4)
  await expect(
    cartLines(page).getByRole("heading", { name: /Sage Nomad/ })
  ).toBeVisible()
})

test("closing the login keeps the guest on the cart", async ({ page }) => {
  await buySage(page)

  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await expect(authDialog(page)).toBeVisible()
  await page.keyboard.press("Escape")

  await expect(authDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/\/cart/)
  await expect(cartLines(page)).toHaveCount(1)
})

test("a merge above the limit warns about the adjustment", async ({ page }) => {
  await page.goto(IVORY_TEN)
  await waitForMocks(page)
  const increase = page.getByRole("button", { name: /^Aumentar quantidade/ })
  await increase.filter({ visible: true }).click()
  await increase.filter({ visible: true }).click()
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/cart/)

  await login(page)

  await expect(
    page.getByText("Ivory Baron #088, edição 1/10: ajustamos para 10.")
  ).toBeVisible()
  await page.goto("/cart?panel=off")
  await expect(
    page.getByRole("status", { name: /^Quantidade de Ivory Baron/ })
  ).toHaveText("10")
})

async function addAsGuest(page: Page, editionId: string, quantity: number) {
  await page.evaluate(
    async ({ key, editionId, quantity }) => {
      const guestCartId = localStorage.getItem(key)
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(guestCartId ? { "X-Cart-Id": guestCartId } : {}),
        },
        body: JSON.stringify({
          nftId: "ivory-baron-088",
          editionId,
          quantity,
        }),
      })
      const { id } = await response.json()
      localStorage.setItem(key, id)
    },
    { key: GUEST_CART_KEY, editionId, quantity }
  )
}

test("merge adjustments of two editions show one notice each", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=off")
  await waitForMocks(page)
  await addAsGuest(page, "ivory-baron-088-1-10", 5)
  await addAsGuest(page, "ivory-baron-088-1-50", 5)
  for (const editionId of ["ivory-baron-088-1-10", "ivory-baron-088-1-50"]) {
    await mocks.emit("nft.updated", "ivory-baron-088", {
      editionId,
      available: 4,
    })
  }

  await login(page)

  await expect(
    page.getByText("Ivory Baron #088, edição 1/10: ajustamos para 4.")
  ).toBeAttached()
  await expect(
    page.getByText("Ivory Baron #088, edição 1/50: ajustamos para 4.")
  ).toBeAttached()
})

test("a sold out edition the user already had warns that it sold out", async ({
  page,
  mocks,
}) => {
  await page.goto("/?panel=off")
  await waitForMocks(page)
  await addAsGuest(page, "ivory-baron-088-1-10", 1)
  await mocks.emit("nft.updated", "ivory-baron-088", {
    editionId: "ivory-baron-088-1-10",
    available: 0,
  })

  await login(page)

  await expect(
    page.getByText("Ivory Baron #088, edição 1/10, esgotou.")
  ).toBeVisible()
  await expect(page.getByText(/ajustamos para/)).toHaveCount(0)
})

test("the login cannot be closed while the merge is running", async ({
  page,
  mocks,
}) => {
  await buySage(page)
  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await expect(authDialog(page)).toBeVisible()
  await mocks.latency(1_000)

  await submitLogin(page, COLLECTOR)
  await page.keyboard.press("Escape")
  await expect(authDialog(page)).toBeVisible()

  await expect(page).toHaveURL(/\/checkout$/, { timeout: 10_000 })
  await mocks.latency(0)
  expect(await storedGuestCartId(page)).toBeNull()
})

test("a guest cart left by a failed merge does not reach another user", async ({
  page,
  mocks,
}) => {
  await buySage(page)
  await mocks.scenario("forbidden")
  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await submitLogin(page, COLLECTOR)
  await expect(page).toHaveURL(/\/checkout$/)
  expect(await storedGuestCartId(page)).toMatch(/^guest-/)

  await mocks.scenario("session-expired")
  await page.goto("/?panel=off")
  await expect.poll(() => storedGuestCartId(page)).toBeNull()

  await mocks.scenario("default")
  await login(page, SECOND)
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(1)
  await expect(
    cartLines(page).getByRole("heading", { name: /Sage Nomad/ })
  ).toHaveCount(0)
})

test("a merge that fails keeps the login and the guest cart", async ({
  page,
  mocks,
}) => {
  await buySage(page)
  await mocks.scenario("forbidden")

  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await submitLogin(page, COLLECTOR)

  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText(/Não foi possível trazer os itens/)).toBeVisible()
  expect(await storedGuestCartId(page)).toMatch(/^guest-/)

  await mocks.scenario("default")
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(4)
  expect(await storedGuestCartId(page)).toBeNull()
})

test("logout empties the cart and a new login recovers it", async ({
  page,
}) => {
  await login(page)
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(3)

  await logout(page)
  await page.goto("/cart?panel=off")
  await expect(page.getByText("Seu carrinho está vazio")).toBeVisible()

  await login(page)
  await page.goto("/cart?panel=off")
  await expect(cartLines(page)).toHaveCount(3)
})

test("logout hides the cart without a page reload", async ({ page }) => {
  await login(page)
  await logout(page)

  await page
    .getByRole("link", { name: /^Carrinho/ })
    .filter({ visible: true })
    .click()

  await expect(page.getByText("Seu carrinho está vazio")).toBeVisible()
  await expect(
    cartLines(page).getByRole("heading", { name: /Ivory Baron/ })
  ).toHaveCount(0)
})

test("one user's cart never shows for another", async ({ page }) => {
  await login(page)
  await page.goto("/cart?panel=off")
  await expect(
    cartLines(page).getByRole("heading", { name: /Ivory Baron/ })
  ).toBeVisible()

  await logout(page)
  await login(page, SECOND)
  await page.goto("/cart?panel=off")

  await expect(cartLines(page)).toHaveCount(1)
  await expect(
    cartLines(page).getByRole("heading", { name: /Golden Signal/ })
  ).toBeVisible()
  await expect(
    cartLines(page).getByRole("heading", { name: /Ivory Baron/ })
  ).toHaveCount(0)
})

test("the seed reproduces the values of the frame", async ({ page }) => {
  await login(page)
  await page.goto("/cart?panel=off")

  const summary = page.getByRole("complementary", {
    name: "Resumo da carteira",
  })
  await expect(summary.getByText("26.83 ETH")).toBeVisible()
  await expect(summary.getByText("(-) 00.00")).toBeVisible()
  await expect(summary.getByText("0.016 ETH")).toBeVisible()
  await expect(summary.getByText("26.846 ETH")).toBeVisible()
})

test("the summary shows a skeleton while loading, without shifting", async ({
  page,
}) => {
  await login(page)
  await page.goto("/cart?panel=off")
  const summary = page.getByRole("complementary", {
    name: "Resumo da carteira",
  })
  await expect(summary.getByText("26.846 ETH")).toBeVisible()
  const loaded = await summary.boundingBox()

  const mocks = page.evaluate(() => {
    ;(
      window as unknown as { __mocks: { latency(ms: number): void } }
    ).__mocks.latency(2000)
  })
  await mocks
  await page.reload()
  await expect(summary).toHaveAttribute("aria-busy", "true")
  const loading = await summary.boundingBox()
  await expect(summary.getByText("26.846 ETH")).toBeVisible({ timeout: 15_000 })

  expect(loading?.height).toBe(loaded?.height)
})

function summaryOf(page: Page) {
  return page.getByRole("complementary", { name: "Resumo da carteira" })
}

test("a valid coupon applies, survives a refresh and can be removed", async ({
  page,
}) => {
  await login(page)
  await page.goto("/cart?panel=off")
  const summary = summaryOf(page)
  await expect(summary.getByText("26.846 ETH")).toBeVisible()

  await summary.getByLabel("Código promocional").fill("kurio10")
  await summary.getByRole("button", { name: "Aplicar" }).click()

  await expect(summary.getByText("(-) 2.683 ETH")).toBeVisible()
  await expect(summary.getByText("24.163 ETH")).toBeVisible()
  await expect(summary.getByText("KURIO10")).toBeVisible()

  await page.reload()
  await expect(summary.getByText("24.163 ETH")).toBeVisible()

  await summary.getByRole("button", { name: "Remover código KURIO10" }).click()
  await expect(summary.getByText("26.846 ETH")).toBeVisible()
  await expect(summary.getByText("(-) 00.00")).toBeVisible()
})

test("expired and unknown coupons show an error on the field", async ({
  page,
}) => {
  await login(page)
  await page.goto("/cart?panel=off")
  const summary = summaryOf(page)
  const field = summary.getByLabel("Código promocional")

  await field.fill("EXPIRED10")
  await summary.getByRole("button", { name: "Aplicar" }).click()
  await expect(summary.getByRole("alert")).toHaveText("Código expirado.")
  await expect(field).toHaveAttribute("aria-invalid", "true")

  await field.fill("INVALIDO")
  await summary.getByRole("button", { name: "Aplicar" }).click()
  await expect(summary.getByRole("alert")).toHaveText("Código inválido.")
  await expect(summary.getByText("26.846 ETH")).toBeVisible()
})
