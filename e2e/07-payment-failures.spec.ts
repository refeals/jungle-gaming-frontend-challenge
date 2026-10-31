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

  test("a required field shows its error on blur", async ({ page }) => {
    await field(page, "Nome de exibição").fill("")
    await field(page, "Nome de usuário").focus()

    await expect(field(page, "Nome de exibição")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    await expect(page.getByText("Campo obrigatório")).toBeVisible()
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
    expect(isMobile(page)).toBe(true)
  })
})
