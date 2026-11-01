import { type Page } from "@playwright/test"

import {
  authDialog,
  COLLECTOR,
  login,
  SECOND,
  submitLogin,
} from "./fixtures/auth.ts"
import {
  confirmButton,
  connect,
  field,
  fillRequiredDetails,
  goToWalletStep,
  isMobile,
  openCheckout,
  openReview,
  placeOrder,
  prepareCheckout,
  receiptHeading,
  review,
} from "./fixtures/checkout.ts"
import { expect, test } from "./fixtures/mocks.ts"

async function logout(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("link", { name: /^Voltar/ }).click()
    await page.getByRole("link", { name: "Perfil", exact: true }).click()
    await page.getByRole("button", { name: "Sair" }).click()
  } else {
    await page.getByRole("button", { name: /^Menu da conta/ }).click()
    await page.getByRole("menuitem", { name: "Sair" }).click()
  }
  await expect(page).not.toHaveURL(/checkout/)
}

async function loginAsSecondWithoutReload(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("link", { name: "Perfil", exact: true }).click()
  } else {
    await page.getByRole("link", { name: "Entrar" }).click()
  }
  await submitLogin(page, SECOND)
  await expect(page.getByRole("dialog")).toBeHidden()
}

test.describe("checkout form", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openCheckout(page)
  })

  test("profile and wallet data come prefilled", async ({ page }) => {
    await expect(field(page, "Nome de usuário")).not.toHaveValue("")
    await expect(field(page, "E-mail")).toHaveValue("collector@kurio.test")
    await expect(field(page, "Nome do perfil")).toHaveValue("collector")
  })

  test("a required field shows its error while editing", async ({ page }) => {
    await field(page, "Nome de exibição").fill("")

    await expect(field(page, "Nome de exibição")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    await expect(page.getByText("Campo obrigatório")).toBeVisible()
  })

  test("a click below an invalid field is not lost", async ({ page }) => {
    test.skip(isMobile(page), "the wallet is on another step on mobile")
    await field(page, "Nome de exibição").fill("")

    await page.getByRole("button", { name: "Conectar carteira" }).click()

    await expect(page.getByText(/^Conectada: /)).toBeVisible()
  })

  test("a draft survives a refresh", async ({ page }) => {
    await field(page, "Observação do colecionador (opcional)").fill(
      "Sem pressa"
    )
    await field(page, "Nome de exibição").fill("Outro nome")

    await page.reload()

    await expect(field(page, "Nome de exibição")).toHaveValue("Outro nome")
    await expect(
      field(page, "Observação do colecionador (opcional)")
    ).toHaveValue("Sem pressa")
  })

  test("a draft does not reach another user without a reload", async ({
    page,
  }) => {
    await field(page, "Nome de exibição").fill("Rascunho de A")
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem("kurio.checkoutDraft.user-collector")
        )
      )
      .toContain("Rascunho de A")

    await logout(page)
    await expect
      .poll(() =>
        page.evaluate(() =>
          sessionStorage.getItem("kurio.checkoutDraft.user-collector")
        )
      )
      .toBeNull()

    await loginAsSecondWithoutReload(page)
    expect(
      await page.evaluate(() => Object.keys(sessionStorage).join())
    ).not.toContain("checkoutDraft")
  })

  test("connecting, rejection and retry are announced", async ({
    page,
    mocks,
  }) => {
    await goToWalletStep(page)
    await mocks.scenario("wallet-rejected")

    await page.getByRole("button", { name: "Conectar carteira" }).click()
    await expect(page.getByText("A carteira recusou a conexão.")).toBeVisible()
    await expect(confirmButton(page)).toHaveAttribute("aria-disabled", "true")

    await mocks.scenario("default")
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page.getByText(/^Conectada: MetaMask/)).toBeVisible()
    await expect(confirmButton(page)).not.toHaveAttribute("aria-disabled")
  })

  test("disconnecting blocks the purchase with the reason", async ({
    page,
  }) => {
    await goToWalletStep(page)
    await connect(page)
    await expect(confirmButton(page)).not.toHaveAttribute("aria-disabled")

    await page
      .getByRole("button", { name: /^Opções de Cofre principal/ })
      .click()
    await page.getByRole("menuitem", { name: "Desconectar" }).click()

    await expect(page.getByText("Carteira desconectada.")).toBeVisible()
    await expect(confirmButton(page)).toHaveAttribute("aria-disabled", "true")
    await expect(
      page.getByText("Conecte a carteira para confirmar a compra.")
    ).toBeVisible()
    await confirmButton(page).click({ force: true })
    await expect(
      page.getByRole("region", { name: /Notifications/ })
    ).toContainText("Conecte a carteira para confirmar a compra.")
  })

  test("changing the network asks to reconnect", async ({ page }) => {
    await goToWalletStep(page)
    await connect(page)

    await field(page, "Rede").click()
    await page.getByRole("option", { name: "Polygon" }).click()

    await expect(
      page.getByText("A rede ou o tipo mudou. Conecte a carteira novamente.")
    ).toBeVisible()
    await expect(confirmButton(page)).toHaveAttribute("aria-disabled", "true")
  })

  test("choosing a wallet type connects with it", async ({ page, mocks }) => {
    await goToWalletStep(page)

    await page.getByRole("radio", { name: "Coinbase Wallet" }).click()

    await expect(page.getByText(/^Conectada: Coinbase Wallet/)).toBeVisible()
    const { wallets } = await mocks.state()
    expect(
      wallets.find(({ id }) => id === "wallet-collector-primary")
        ?.connectedWalletType
    ).toBe("coinbase")
  })
})

test("session expiry keeps the form and resumes after login", async ({
  page,
  mocks,
}) => {
  await login(page)
  await openCheckout(page)
  await goToWalletStep(page)
  if (!isMobile(page)) await fillRequiredDetails(page)
  await mocks.scenario("session-expired")

  await page.getByRole("button", { name: "Conectar carteira" }).click()

  await expect(authDialog(page)).toBeVisible()
  await submitLogin(page, COLLECTOR)
  await expect(authDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/\/checkout/)
  if (isMobile(page)) await page.goBack()
  await expect(field(page, "Código de indicação")).toHaveValue("KURIO-1")
})

test("a failed entry read shows the error, not a stale form", async ({
  page,
  mocks,
}) => {
  await login(page)
  await page.goto("/cart?panel=off")
  await expect(page.getByText("26.846 ETH")).toBeVisible()
  await mocks.scenario("server-error")

  await page.evaluate(() => {
    history.pushState({}, "", "/checkout?panel=off")
    dispatchEvent(new PopStateEvent("popstate"))
  })

  await expect(
    page.getByText("Não foi possível carregar o pagamento")
  ).toBeVisible({ timeout: 15_000 })
  await expect(field(page, "Nome de exibição")).toHaveCount(0)

  await mocks.scenario("default")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(field(page, "Nome de exibição")).toBeVisible()
})

test.describe("coupon inside the summary", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "only on desktop")

  test("applying a coupon does not confirm the purchase", async ({ page }) => {
    await login(page)
    await openCheckout(page)

    await page.getByRole("button", { name: /Aplique aqui/ }).click()
    await page.getByLabel("Código promocional").fill("KURIO10")
    await page.getByRole("button", { name: "Aplicar" }).click()

    await expect(page.getByText("KURIO10")).toBeVisible()
    await expect(field(page, "Código de indicação")).not.toHaveAttribute(
      "aria-invalid",
      "true"
    )
    await expect(
      page.getByRole("region", { name: /Notifications/ })
    ).not.toContainText("Conecte a carteira")
  })
})

test("enter in a field submits the form", async ({ page }) => {
  await login(page)
  await openCheckout(page)
  await fillRequiredDetails(page)

  await field(page, "Código de indicação").press("Enter")

  if (isMobile(page)) {
    await expect(page).toHaveURL(/step=wallet/)
  } else {
    await expect(
      page.getByRole("region", { name: /Notifications/ })
    ).toContainText("Conecte a carteira para confirmar a compra.")
  }
})

test.describe("mobile steps", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, "only on mobile")

  test.beforeEach(async ({ page }) => {
    await login(page)
    await openCheckout(page)
  })

  test("each step validates only its fields", async ({ page }) => {
    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(page).not.toHaveURL(/step=wallet/)
    await expect(field(page, "Código de indicação")).toHaveAttribute(
      "aria-invalid",
      "true"
    )

    await fillRequiredDetails(page)
    await goToWalletStep(page)
    await page.goBack()

    await expect(page).not.toHaveURL(/step=wallet/)
    await expect(field(page, "Código de indicação")).toHaveValue("KURIO-1")
  })

  test("a later step with pending fields returns to the first", async ({
    page,
  }) => {
    await page.goto("/checkout?step=wallet&panel=off")
    await expect(page).toHaveURL(/step=details/)
    await expect(field(page, "Nome de exibição")).toBeVisible()
  })

  test("an invalid step falls back to details", async ({ page }) => {
    await page.goto("/checkout?step=whatever&panel=off")
    await expect(field(page, "Nome de exibição")).toBeVisible()
  })
})

test.describe("order submit", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
    await openReview(page)
  })

  test("a double click creates a single order", async ({ page, mocks }) => {
    let orderPosts = 0
    page.on("request", (request) => {
      const isOrders = new URL(request.url()).pathname === "/api/orders"
      if (isOrders && request.method() === "POST") orderPosts += 1
    })
    await mocks.latency(300)
    await review(page)
      .getByRole("button", { name: "Confirmar compra" })
      .dblclick()

    await expect(page).toHaveURL(/\/orders\//)
    expect(orderPosts).toBe(1)
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("a timeout recovers the same order on retry", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-timeout")
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()

    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible({
      timeout: 15_000,
    })
    const { orders } = await mocks.state()
    expect(orders).toHaveLength(1)

    await mocks.scenario("default")
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page).toHaveURL(new RegExp(`/orders/${orders[0].id}`))
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("a refresh after a timeout still recovers the same order", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-timeout")
    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible({
      timeout: 15_000,
    })
    const { orders } = await mocks.state()

    await page.reload()

    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page).toHaveURL(new RegExp(`/orders/${orders[0].id}`))
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("escape right after sending keeps the review open", async ({
    page,
    mocks,
  }) => {
    test.skip(isMobile(page), "the review is a dialog only on desktop")
    await mocks.latency(800)

    await review(page).getByRole("button", { name: "Confirmar compra" }).click()
    await page.keyboard.press("Escape")

    await expect(
      page.getByRole("button", { name: "Enviando..." })
    ).toBeVisible()
    await expect(page).toHaveURL(/\/orders\//)
    expect((await mocks.state()).orders).toHaveLength(1)
  })
})

test("a declined payment has no receipt and keeps the cart", async ({
  page,
  mocks,
}) => {
  await login(page)
  await mocks.scenario("payment-declined")
  await placeOrder(page)

  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" })
  ).toBeVisible({ timeout: 8000 })
  await expect(receiptHeading(page)).toHaveCount(0)
  const { carts } = await mocks.state()
  expect(
    carts.find(({ userId }) => userId === "user-collector")?.items
  ).toHaveLength(3)

  await mocks.scenario("default")
  await page.getByRole("link", { name: "Voltar ao pagamento" }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(field(page, "Nome de exibição")).toBeVisible()

  await goToWalletStep(page)
  await expect(page.getByText(/^Conectada: /)).toBeVisible()
  await openReview(page)
  await review(page).getByRole("button", { name: "Confirmar compra" }).click()
  await expect(page).toHaveURL(/\/orders\//)
  await expect(receiptHeading(page)).toBeVisible({ timeout: 8000 })
  const { orders } = await mocks.state()
  expect(orders.map(({ status }) => status)).toEqual(["declined", "confirmed"])
})

const buy = (page: Page) =>
  review(page).getByRole("button", { name: "Confirmar compra" })

test.describe("recovery after a failed send", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
    await openReview(page)
  })

  test("a session expiry during the retry keeps the recovery", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-timeout")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible({
      timeout: 15_000,
    })
    const { orders } = await mocks.state()

    await mocks.scenario("session-expired")
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(authDialog(page)).toBeVisible()
    await mocks.scenario("default")
    await submitLogin(page, COLLECTOR)
    await expect(authDialog(page)).toBeHidden()

    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page).toHaveURL(new RegExp(`/orders/${orders[0].id}`))
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("a 5xx keeps the same attempt and the retry creates one order", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    expect((await mocks.state()).orders).toHaveLength(0)

    await mocks.scenario("default")
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page).toHaveURL(/\/orders\//)
    expect((await mocks.state()).orders).toHaveLength(1)
  })

  test("a permanent error on the retry leaves the recovery screen", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await mocks.scenario("default")

    await page.goto("/cart?panel=off")
    const remove = page
      .getByRole("button", { name: /^Remover / })
      .filter({ visible: true })
    await expect(remove).toHaveCount(3)
    for (const count of [2, 1, 0]) {
      await remove.first().click()
      await expect(remove).toHaveCount(count)
    }

    await page.goto("/checkout?panel=off")
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page).toHaveURL(/\/cart/)
    await expect(
      page.getByRole("heading", { name: "Seu carrinho está vazio" })
    ).toBeVisible()
    await page.goto("/checkout?panel=off")
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText("Não confirmamos seu pedido")).toHaveCount(0)
  })

  test("an availability conflict on the retry only redirects from checkout", async ({
    page,
    mocks,
  }) => {
    test.skip(isMobile(page), "O mobile não tem link de saída nesta tela")

    const notice = page.getByText("Há itens sem disponibilidade.", {
      exact: false,
    })
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await mocks.scenario("default")
    await mocks.emit("nft.updated", "ivory-baron-088", {
      editionId: "ivory-baron-088-1-10",
      available: 0,
    })
    await mocks.latency(1000)

    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await page
      .getByRole("link", { name: "Início", exact: true })
      .first()
      .click()

    await expect(notice).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("article").first()).toBeVisible()
    await expect(page).not.toHaveURL(/\/cart/)
  })

  test("an availability conflict on the retry goes to the cart", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await mocks.scenario("default")
    await mocks.emit("nft.updated", "ivory-baron-088", {
      editionId: "ivory-baron-088-1-10",
      available: 0,
    })

    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page).toHaveURL(/\/cart/)
  })

  test("a stale quote on the retry warns and asks to confirm again", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "1.29" })

    await mocks.scenario("default")
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(
      page.getByRole("region", { name: /Notifications/ })
    ).toContainText("Os valores mudaram")
    expect((await mocks.state()).orders).toHaveLength(0)
  })

  test("a retry without a stored attempt leaves the screen", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await mocks.scenario("default")
    await page.evaluate(() =>
      localStorage.removeItem("kurio.checkoutAttempt.user-collector")
    )

    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page.getByText("Não confirmamos seu pedido")).toHaveCount(0)
  })

  test("a new user clears the attempt of the previous one", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("order-error")
    await buy(page).click()
    await expect(page.getByText("Não confirmamos seu pedido")).toBeVisible()
    await mocks.scenario("default")
    await page.evaluate(() => localStorage.removeItem("kurio.session.token"))

    await login(page, SECOND)

    expect(
      await page.evaluate(() =>
        localStorage.getItem("kurio.checkoutAttempt.user-collector")
      )
    ).toBeNull()
  })

  test("the renewed notice does not outlive a real change", async ({
    page,
    mocks,
  }) => {
    await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "1.19" })
    await expect(review(page).getByText(/foi renovada/)).toBeVisible()

    await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "1.29" })
    await review(page)
      .getByRole("button", { name: "Confirmar novos valores" })
      .click()

    await expect(buy(page)).toBeVisible()
    await expect(review(page).getByText(/foi renovada/)).toHaveCount(0)
  })
})

test("a session expiry when sending keeps the form and buys once", async ({
  page,
  mocks,
}) => {
  await login(page)
  await prepareCheckout(page)
  await openReview(page)
  await mocks.scenario("session-expired")

  await buy(page).click()
  await expect(authDialog(page)).toBeVisible()
  await mocks.scenario("default")
  await submitLogin(page, COLLECTOR)
  await expect(authDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/\/checkout/)
  expect((await mocks.state()).orders).toHaveLength(0)

  await expect(confirmButton(page).or(buy(page)).first()).toBeVisible()
  if (!isMobile(page)) await openReview(page)
  await buy(page).click()

  await expect(page).toHaveURL(/\/orders\//)
  expect((await mocks.state()).orders).toHaveLength(1)
})

test("the secondary wallet survives two reloads with a draft", async ({
  page,
}) => {
  test.skip(isMobile(page), "the toggle is only on desktop")
  await login(page)
  await prepareCheckout(page)
  await page.getByLabel(/Usar outra carteira/).check()
  await expect(page.getByText(/^Conectada: Coinbase Wallet/)).toBeVisible()

  await page.reload()
  await expect(page.getByText("Selecionada: Cofre secundário")).toBeVisible()
  await field(page, "Observação do colecionador (opcional)").fill("mudei")
  await page.reload()

  await expect(page.getByText("Selecionada: Cofre secundário")).toBeVisible()
})

test.describe("mobile review", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, "only on mobile")

  test.beforeEach(async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
  })

  test("entering and leaving by keyboard moves focus to the heading", async ({
    page,
  }) => {
    await confirmButton(page).focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: /Revisão do pedido/ })
    ).toBeFocused()

    await page.goBack()
    await expect(
      page.getByRole("heading", { name: /Pagamento com carteira/ })
    ).toBeFocused()
  })

  test("a failed quote offers a retry instead of a skeleton", async ({
    page,
    mocks,
  }) => {
    await mocks.scenario("quote-error")
    await page.goto("/checkout?step=review&panel=off")

    await expect(
      page.getByText("Não foi possível atualizar a cotação.")
    ).toBeVisible({ timeout: 15_000 })

    await mocks.scenario("default")
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(buy(page)).toBeVisible()
  })

  test("a disconnected wallet sends the review back to the wallet step", async ({
    page,
  }) => {
    await openReview(page)
    await page.evaluate(async () => {
      await fetch("/api/wallets/wallet-collector-primary/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("kurio.session.token")}`,
        },
      })
    })

    await buy(page).click()

    await expect(page).toHaveURL(/step=wallet/)
    await expect(
      page.getByRole("button", { name: "Conectar carteira" })
    ).toBeVisible()
  })
})
