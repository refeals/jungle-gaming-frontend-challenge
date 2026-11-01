import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"

import { authDialog, login, SECOND } from "./fixtures/auth.ts"
import {
  confirmButton,
  connect,
  field,
  isMobile,
  openCheckout,
  placeOrder,
  prepareCheckout,
  receiptHeading,
} from "./fixtures/checkout.ts"
import { expect, test, waitForMocks } from "./fixtures/mocks.ts"

const EMERALD = "/nft/emerald-ape-042?panel=off"

async function tabTo(page: Page, target: Locator, maxTabs = 150) {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press("Tab")
    if (await target.evaluate((node) => node === document.activeElement)) {
      return
    }
  }
  throw new Error(`Tab did not reach ${target}`)
}

async function expectTrapped(page: Page, container: Locator, tabs = 25) {
  for (let index = 0; index < tabs; index += 1) {
    await page.keyboard.press("Tab")
    await expect
      .poll(() =>
        container.evaluate((node) => node.contains(document.activeElement))
      )
      .toBe(true)
  }
}

function readFocusStyles(target: Locator) {
  return target.evaluate((node) => {
    const { outlineStyle, outlineWidth, outlineColor, boxShadow } =
      getComputedStyle(node)
    return { outlineStyle, outlineWidth, outlineColor, boxShadow }
  })
}

async function expectVisibleFocus(page: Page, target: Locator) {
  const resting = await readFocusStyles(target)
  await tabTo(page, target)
  const focused = await readFocusStyles(target)

  const hasOutline =
    focused.outlineStyle !== "none" &&
    focused.outlineWidth !== "0px" &&
    focused.outlineColor !== "rgba(0, 0, 0, 0)"
  expect(hasOutline || focused.boxShadow !== resting.boxShadow).toBe(true)
}

async function expectAssociatedError(page: Page, input: Locator) {
  await expect(input).toHaveAttribute("aria-invalid", "true")
  const describedBy = await input.getAttribute("aria-describedby")
  expect(describedBy).toBeTruthy()
  for (const id of describedBy!.split(" ")) {
    const message = page.locator(`[id="${id}"]`)
    await expect(message).toBeVisible()
    await expect(message).not.toBeEmpty()
  }
}

async function expectNoSeriousViolations(page: Page) {
  const footerForm = page.getByRole("heading", {
    name: "Antecipe-se ao próximo lançamento",
  })
  if (await footerForm.isVisible()) {
    await footerForm.scrollIntoViewIfNeeded()
    await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible()
  }

  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations
    .filter(({ impact }) => impact === "serious" || impact === "critical")
    .map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target.join(" ")),
    }))
  expect(serious).toEqual([])
}

test.describe("keyboard only", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "only on desktop")

  test("buys from the catalog to the receipt without a mouse", async ({
    page,
  }) => {
    await page.goto("/?panel=off&auth=login")
    const dialog = authDialog(page)
    await expect(dialog.getByLabel("E-mail")).toBeFocused()
    await page.keyboard.type("collector@kurio.test")
    await page.keyboard.press("Tab")
    await page.keyboard.type("Kurio@123")
    await page.keyboard.press("Enter")
    await expect(dialog).toBeHidden()

    await expect(page.getByTestId("catalog-grid")).toBeVisible()
    await tabTo(
      page,
      page
        .getByRole("article")
        .filter({ hasText: "Sage Nomad" })
        .first()
        .getByRole("link")
        .first()
    )
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/nft\//)

    const buy = page.getByRole("button", { name: "COMPRAR", exact: true })
    await expect(buy).toBeVisible()
    await tabTo(page, buy)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/cart/)

    const finish = page.getByRole("link", { name: "Conectar e finalizar" })
    await expect(finish).toBeVisible()
    await tabTo(page, finish)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/checkout/)

    const code = field(page, "Código de indicação")
    await expect(code).toBeVisible()
    await tabTo(page, code)
    await page.keyboard.type("KURIO-1")
    const connectWallet = page.getByRole("button", {
      name: "Conectar carteira",
    })
    await tabTo(page, connectWallet)
    await page.keyboard.press("Enter")
    await expect(page.getByText(/^Conectada: /)).toBeVisible()

    await expect(confirmButton(page)).not.toHaveAttribute("aria-disabled")
    await tabTo(page, confirmButton(page))
    await page.keyboard.press("Enter")

    const review = page.getByRole("dialog")
    const send = review.getByRole("button", { name: "Confirmar compra" })
    await expect(send).toBeVisible()
    await tabTo(page, send)
    await page.keyboard.press("Enter")

    await expect(page).toHaveURL(/\/orders\//)
    await expect(receiptHeading(page)).toBeVisible({ timeout: 8000 })
  })

  test("the zoom traps focus and gives it back", async ({ page }) => {
    await page.goto(EMERALD)
    const trigger = page.getByRole("button", { name: "Ampliar imagem" })
    await trigger.focus()
    await page.keyboard.press("Enter")

    const dialog = page.getByRole("dialog", { name: "Emerald Ape #042" })
    await expect(dialog).toBeVisible()
    await expectTrapped(page, dialog)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("the login dialog traps focus and gives it back", async ({ page }) => {
    await page.goto("/?panel=off")
    const trigger = page.getByRole("link", { name: "Entrar" })
    await trigger.focus()
    await page.keyboard.press("Enter")

    const dialog = authDialog(page)
    await expect(dialog).toBeVisible()
    await expectTrapped(page, dialog)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("the review traps focus and gives it back", async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
    await confirmButton(page).focus()
    await page.keyboard.press("Enter")

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByRole("heading", { name: "Revise seu pedido" })
    ).toBeVisible()
    await expectTrapped(page, dialog)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(confirmButton(page)).toBeFocused()
  })

  test("the account menu moves focus and gives it back", async ({ page }) => {
    await login(page)
    const trigger = page.getByRole("button", { name: /^Menu da conta/ })
    await trigger.focus()
    await page.keyboard.press("Enter")

    const profile = page.getByRole("menuitem", { name: "Perfil" })
    await expect(profile).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await expect(profile).not.toBeFocused()
    await expect(page.getByRole("menu")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("focus is visible on links, buttons and fields", async ({ page }) => {
    await page.goto("/?panel=off")

    await expect(page.getByTestId("catalog-grid")).toBeVisible()
    await expectVisibleFocus(page, page.getByRole("link", { name: "Mercado" }))
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: "Destaque 2 de 3" })
    )
    await expectVisibleFocus(
      page,
      page.getByRole("button", { name: /^Música/ })
    )
    const lastBeforeFooter = page
      .getByRole("button", { name: /Ler mais/ })
      .last()
    await lastBeforeFooter.focus()
    const newsletterField = page.getByRole("contentinfo").getByRole("textbox")
    await expect(newsletterField).toBeVisible()
    await page.keyboard.press("Tab")
    await expect(newsletterField).toBeFocused()
    await lastBeforeFooter.focus()
    await expectVisibleFocus(page, newsletterField)

    await page.goto("/?panel=off&auth=login")
    await expectVisibleFocus(
      page,
      authDialog(page).getByLabel("Senha", { exact: true })
    )
  })
})

test("the filters drawer traps focus and gives it back", async ({ page }) => {
  test.skip(!isMobile(page), "the drawer only shows below lg")
  await page.goto("/?panel=off")

  const trigger = page.getByRole("button", { name: "Abrir filtros" }).first()
  await trigger.focus()
  await page.keyboard.press("Enter")

  const drawer = page.getByRole("dialog", { name: "Filtros" })
  await expect(drawer).toBeVisible()
  await expectTrapped(page, drawer)

  await page.keyboard.press("Escape")
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
})

test.describe("empty submits show associated errors", () => {
  test("login", async ({ page }) => {
    await page.goto("/?panel=off&auth=login")
    const dialog = authDialog(page)

    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()

    await expectAssociatedError(page, dialog.getByLabel("E-mail"))
    await expectAssociatedError(
      page,
      dialog.getByLabel("Senha", { exact: true })
    )
  })

  test("register", async ({ page }) => {
    await page.goto("/?panel=off&auth=register")
    const dialog = authDialog(page)

    await dialog.locator("button[type=submit]").click()

    await expectAssociatedError(page, dialog.getByLabel("Nome de usuário"))
    await expectAssociatedError(page, dialog.getByLabel("E-mail"))
    await expectAssociatedError(
      page,
      dialog.getByLabel("Senha", { exact: true })
    )
    await expectAssociatedError(page, dialog.getByLabel("Confirmar senha"))
  })

  test("profile", async ({ page }) => {
    await login(page)
    await page.goto("/profile?panel=off")
    const name = page.getByLabel("Nome de exibição")
    await expect(name).not.toHaveValue("")

    await name.fill("")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()

    await expectAssociatedError(page, name)
  })

  test("password", async ({ page }) => {
    await login(page)
    await page.goto("/profile?panel=off")
    await expect(page.getByLabel("Nome de exibição")).not.toHaveValue("")

    await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha@123")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()

    await expectAssociatedError(page, page.getByLabel("Senha atual"))
    await expectAssociatedError(page, page.getByLabel("Confirmar nova senha"))
  })

  test("wallet", async ({ page }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const section = page.locator("section", {
      has: page.getByRole("heading", { name: "Carteira secundária" }),
    })

    await section.getByRole("button", { name: "Adicionar" }).click()
    await section.getByRole("button", { name: "Salvar carteira" }).click()

    for (const label of [
      "Nome de exibição",
      "Apelido da carteira",
      "Rede",
      "Endereço da carteira",
      "Tipo de carteira",
      "Código de indicação",
    ]) {
      await expectAssociatedError(page, section.getByLabel(label))
    }
  })

  test("payment", async ({ page }) => {
    await login(page)
    await openCheckout(page)
    const name = field(page, "Nome de exibição")
    await name.fill("")

    if (isMobile(page)) {
      await page.getByRole("button", { name: "Continuar" }).click()
    } else {
      await connect(page)
      await confirmButton(page).click()
    }

    await expectAssociatedError(page, name)
    await expectAssociatedError(page, field(page, "Código de indicação"))
  })
})

test.describe("live regions announce", () => {
  async function expectAnnounced(page: Page, text: string | RegExp) {
    const region = page
      .locator("[aria-live], [role=status], [role=alert]")
      .filter({ hasText: text })
    await expect(region.first()).toBeAttached()
    await expect(page.getByText(text).first()).toBeVisible()
  }

  test("a mutation result", async ({ page }) => {
    await page.goto(EMERALD)
    await page
      .getByRole("button", { name: /ao carrinho$/ })
      .filter({ visible: true })
      .first()
      .click()

    await expectAnnounced(page, /adicionad[oa]/i)
  })

  test("a real time price change", async ({ page, mocks }) => {
    await page.goto(EMERALD)
    await waitForMocks(page)
    await expect
      .poll(async () => (await mocks.state()).mock.connectionCount)
      .toBeGreaterThan(0)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    await mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "2.50" })

    await expectAnnounced(page, "Preço atualizado para 2.50 ETH")
  })

  test("a wallet rejection", async ({ page, mocks }) => {
    await login(page)
    await openCheckout(page)
    await field(page, "Código de indicação").fill("KURIO-1")
    if (isMobile(page)) {
      await page.getByRole("button", { name: "Continuar" }).click()
    }
    await mocks.scenario("wallet-rejected")

    await page.getByRole("button", { name: "Conectar carteira" }).click()

    await expectAnnounced(page, "A carteira recusou a conexão.")
  })
})

test.describe("axe finds no serious or critical violations", () => {
  async function loaded(page: Page, path: string, heading: string | RegExp) {
    await page.goto(path)
    await expect(
      page.getByRole("heading", { name: heading }).first()
    ).toBeVisible()
  }

  test("home", async ({ page }) => {
    await page.goto("/?panel=off")
    await expect(page.getByTestId("catalog-grid")).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test("detail", async ({ page }) => {
    await loaded(page, EMERALD, "Emerald Ape #042")
    await expectNoSeriousViolations(page)
  })

  test("not found", async ({ page }) => {
    await loaded(page, "/nao-existe?panel=off", "Página não encontrada")
    await expectNoSeriousViolations(page)
  })

  test("login dialog", async ({ page }) => {
    await page.goto("/?panel=off&auth=login")
    await expect(authDialog(page)).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test("register dialog", async ({ page }) => {
    await page.goto("/?panel=off&auth=register")
    await expect(authDialog(page)).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test("favorites", async ({ page }) => {
    await login(page)
    await loaded(page, "/favorites?panel=off", /Emerald Ape/)
    await expectNoSeriousViolations(page)
  })

  test("cart", async ({ page }) => {
    await login(page)
    await page.goto("/cart?panel=off")
    await expect(page.getByText("26.846 ETH").first()).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test("payment", async ({ page }) => {
    await login(page)
    await openCheckout(page)
    await expectNoSeriousViolations(page)
  })

  test("review", async ({ page }) => {
    await login(page)
    await prepareCheckout(page)
    await confirmButton(page).click()
    await expect(
      page.getByRole("heading", { name: /Revis[ãe]/ }).first()
    ).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test("receipt", async ({ page }) => {
    await login(page)
    await placeOrder(page)
    await expect(receiptHeading(page)).toBeVisible({ timeout: 8000 })
    await expectNoSeriousViolations(page)
  })

  test("profile", async ({ page }) => {
    await login(page)
    await page.goto("/profile?panel=off")
    await expect(page.getByLabel("Nome de exibição")).not.toHaveValue("")
    await expectNoSeriousViolations(page)
  })

  test("wallets", async ({ page }) => {
    await login(page)
    await loaded(page, "/wallets?panel=off", "Carteira principal")
    await expectNoSeriousViolations(page)
  })
})
