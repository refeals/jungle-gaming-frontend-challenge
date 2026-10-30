import type { Locator, Page } from "@playwright/test"

import { COLLECTOR, login, SECOND, submitLogin } from "./fixtures/auth.ts"
import { expect, test, waitForMocks } from "./fixtures/mocks.ts"

const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
  "base64"
)

const NEW_PASSWORD = "NovaSenha@123"
const VALID_ADDRESS = `0x${"a".repeat(40)}`

async function openProfile(page: Page, credentials = COLLECTOR) {
  await login(page, credentials)
  await page.goto("/profile?panel=off")
  await waitForMocks(page)
  await expect(page.getByLabel("Nome de exibição")).not.toHaveValue("")
}

async function openWallets(page: Page, credentials = COLLECTOR) {
  await login(page, credentials)
  await page.goto("/wallets?panel=off")
  await waitForMocks(page)
  await expect(
    page.getByRole("heading", { name: "Carteira principal" })
  ).toBeVisible()
}

function saveProfile(page: Page) {
  return page.getByRole("button", { name: "Salvar", exact: true }).click()
}

async function fillWalletSpecifics(page: Page, form: Locator, address: string) {
  await form.getByLabel("Apelido da carteira").fill("Cofre reserva")
  await selectOption(page, form.getByLabel("Rede"), "Polygon")
  await form.getByLabel("Endereço da carteira").fill(address)
  await selectOption(page, form.getByLabel("Tipo de carteira"), "Coinbase")
  await form.getByLabel("Código de indicação").fill("KURIO")
  await form.getByRole("textbox", { name: "Nome ENS" }).fill("reserva")
}

async function selectOption(page: Page, trigger: Locator, option: string) {
  await trigger.click()
  await page.getByRole("option", { name: option }).click()
}

test.describe("profile", () => {
  test("editing persists after refresh", async ({ page }) => {
    await openProfile(page)

    await page.getByLabel("Nome de exibição").fill("Nome Novo")
    await saveProfile(page)

    await expect(page.getByText("Perfil atualizado.")).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nome Novo")
  })

  test("the frame required fields are validated locally", async ({ page }) => {
    await openProfile(page, SECOND)

    await page.getByLabel("Nome de exibição").fill("Outro nome")
    await saveProfile(page)

    await expect(
      page.getByRole("textbox", { name: "Nome ENS" })
    ).toHaveAccessibleDescription("Campo obrigatório")
    await expect(page.getByRole("textbox", { name: "Nome ENS" })).toBeFocused()
    await expect(
      page.getByLabel("Apelido da carteira")
    ).toHaveAccessibleDescription("Campo obrigatório")
  })

  test("form-validation-error shows the api error on the field", async ({
    page,
    mocks,
  }) => {
    await openProfile(page)
    await mocks.scenario("form-validation-error")

    await page.getByLabel("Nome de usuário").fill("outro")
    await saveProfile(page)

    const displayName = page.getByLabel("Nome de exibição")
    await expect(displayName).toHaveAccessibleDescription(
      "Este nome não pode ser usado."
    )
    await expect(displayName).toBeFocused()
  })

  test("an email taken by another user shows on the field", async ({
    page,
  }) => {
    await openProfile(page)

    await page
      .getByRole("main")
      .getByRole("textbox", { name: "E-mail" })
      .fill(SECOND.email)
    await saveProfile(page)

    await expect(
      page.getByRole("main").getByRole("textbox", { name: "E-mail" })
    ).toHaveAccessibleDescription("Este e-mail já está cadastrado.")
  })

  test("saving with no change only informs", async ({ page }) => {
    await openProfile(page)

    await saveProfile(page)

    await expect(page.getByText("Nenhuma alteração para salvar.")).toBeVisible()
  })
})

test.describe("avatar", () => {
  const fileInput = (page: Page) =>
    page.getByLabel("Selecionar imagem do avatar")

  test("a valid image is saved, shown in the header, and can be removed", async ({
    page,
  }, testInfo) => {
    await openProfile(page)

    await fileInput(page).setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PIXEL_PNG,
    })

    const preview = page.getByRole("img", { name: "Avatar atual" })
    await expect(preview).toBeVisible()
    await expect(preview).toHaveAttribute("src", /^data:image\//)
    if (testInfo.project.name === "desktop") {
      await expect(
        page.getByRole("button", { name: /^Menu da conta/ }).locator("img")
      ).toBeVisible()
    }

    await page.reload()
    await expect(page.getByRole("img", { name: "Avatar atual" })).toBeVisible()

    await page.getByRole("button", { name: "Remover" }).click()

    await expect(page.getByRole("img", { name: "Avatar atual" })).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel("Nome de exibição")).not.toHaveValue("")
    await expect(page.getByRole("img", { name: "Avatar atual" })).toHaveCount(0)
  })

  test("a wrong type shows an error and sends nothing", async ({ page }) => {
    await openProfile(page)

    await fileInput(page).setInputFiles({
      name: "avatar.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("texto"),
    })

    await expect(fileInput(page)).toHaveAccessibleDescription(
      "Use uma imagem PNG, JPEG ou WebP."
    )
    await expect(page.getByRole("img", { name: "Avatar atual" })).toHaveCount(0)
  })

  test("a file above 500 KB shows an error and sends nothing", async ({
    page,
  }) => {
    await openProfile(page)

    await fileInput(page).setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(501 * 1024),
    })

    await expect(fileInput(page)).toHaveAccessibleDescription(
      "A imagem deve ter até 500 KB."
    )
  })
})

test.describe("password", () => {
  const current = (page: Page) => page.getByLabel("Senha atual")
  const next = (page: Page) => page.getByLabel("Nova senha", { exact: true })
  const confirm = (page: Page) => page.getByLabel("Confirmar nova senha")

  test("a wrong current password shows the api error", async ({ page }) => {
    await openProfile(page)

    await current(page).fill("errada-123")
    await next(page).fill(NEW_PASSWORD)
    await confirm(page).fill(NEW_PASSWORD)
    await saveProfile(page)

    await expect(current(page)).toHaveAccessibleDescription(
      "Senha atual incorreta."
    )
    await expect(current(page)).toBeFocused()
  })

  test("a short or different new password is rejected locally", async ({
    page,
  }) => {
    await openProfile(page)

    await current(page).fill(COLLECTOR.password)
    await next(page).fill("curta")
    await confirm(page).fill("outra")
    await saveProfile(page)

    await expect(next(page)).toHaveAccessibleDescription(
      "Use ao menos 8 caracteres"
    )
    await expect(confirm(page)).toHaveAccessibleDescription(
      "As senhas não coincidem"
    )
  })

  test("success clears the fields and the new password logs in", async ({
    page,
  }) => {
    await openProfile(page)

    await current(page).fill(COLLECTOR.password)
    await next(page).fill(NEW_PASSWORD)
    await confirm(page).fill(NEW_PASSWORD)
    await saveProfile(page)

    await expect(page.getByText("Senha alterada.")).toBeVisible()
    await expect(current(page)).toHaveValue("")
    await expect(next(page)).toHaveValue("")

    await page
      .getByRole("navigation", { name: "Conta" })
      .getByRole("button", { name: "Sair" })
      .click()
    await page.goto("/?auth=login&panel=off")
    await submitLogin(page, COLLECTOR)
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible()

    await submitLogin(page, { ...COLLECTOR, password: NEW_PASSWORD })
    await expect(page.getByRole("dialog")).toBeHidden()
  })

  test("only the current password filled is not a password change", async ({
    page,
  }) => {
    await openProfile(page)

    await current(page).fill(COLLECTOR.password)
    await saveProfile(page)

    await expect(page.getByText("Nenhuma alteração para salvar.")).toBeVisible()
    await expect(next(page)).toHaveAccessibleDescription("")
  })

  test("profile and password fail independently", async ({ page }) => {
    await openProfile(page)

    await page.getByLabel("Nome de exibição").fill("Salvo mesmo assim")
    await current(page).fill("errada-123")
    await next(page).fill(NEW_PASSWORD)
    await confirm(page).fill(NEW_PASSWORD)
    await saveProfile(page)

    await expect(current(page)).toHaveAccessibleDescription(
      "Senha atual incorreta."
    )
    await expect(page.getByText("Perfil atualizado.")).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Nome de exibição")).toHaveValue(
      "Salvo mesmo assim"
    )
  })
})

test.describe("wallets", () => {
  const primaryForm = (page: Page) =>
    page
      .locator("section", {
        has: page.getByRole("heading", { name: "Carteira principal" }),
      })
      .locator("form")

  const secondarySection = (page: Page) =>
    page.locator("section", {
      has: page.getByRole("heading", { name: "Carteira secundária" }),
    })

  test("an invalid address is rejected locally", async ({ page }) => {
    await openWallets(page)
    const form = primaryForm(page)

    await form.getByLabel("Endereço da carteira").fill("abc")
    await form.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(
      form.getByLabel("Endereço da carteira")
    ).toHaveAccessibleDescription("Endereço 0x inválido")
  })

  test("an address owned by another user shows on the field", async ({
    page,
  }) => {
    const db = await openWalletsAndReadOtherAddress(page)
    const form = primaryForm(page)

    await form.getByLabel("Endereço da carteira").fill(db)
    await form.getByLabel("Código de indicação").fill("KURIO")
    await form.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(
      form.getByLabel("Endereço da carteira")
    ).toHaveAccessibleDescription("Este endereço já está em uso.")
  })

  test("editing the primary wallet persists", async ({ page }) => {
    await openWallets(page)
    const form = primaryForm(page)

    await form.getByLabel("Apelido da carteira").fill("Cofre novo")
    await form.getByLabel("Código de indicação").fill("KURIO")
    await form.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(page.getByText("Carteira salva.")).toBeVisible()
    await page.reload()
    await expect(
      primaryForm(page).getByLabel("Apelido da carteira")
    ).toHaveValue("Cofre novo")
  })

  test("a form-validation-error appears on the field", async ({
    page,
    mocks,
  }) => {
    await openWallets(page)
    await mocks.scenario("form-validation-error")
    const form = primaryForm(page)

    await form.getByLabel("Código de indicação").fill("KURIO")
    await form.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(
      form.getByLabel("Nome de exibição")
    ).toHaveAccessibleDescription("Este nome não pode ser usado.")
  })

  test("the copy brings only account data and saves nothing", async ({
    page,
  }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const section = secondarySection(page)

    await section.getByLabel("Igual à carteira principal").check()

    const form = section.locator("form")
    await expect(form.getByLabel("Nome de exibição")).toHaveValue(
      "Segunda Conta"
    )
    await expect(form.getByRole("textbox", { name: "E-mail" })).toHaveValue(
      SECOND.email
    )
    await expect(form.getByLabel("Endereço da carteira")).toHaveValue("")
    await expect(form.getByLabel("Apelido da carteira")).toHaveValue("")
    await expect(form.getByLabel("Rede")).toHaveText(/Selecione uma rede/)
    await expect(form.getByLabel("Tipo de carteira")).toHaveText(
      /Selecione uma carteira/
    )

    await page.reload()
    await expect(
      secondarySection(page).getByText(
        "Você ainda não adicionou uma carteira secundária."
      )
    ).toBeVisible()
  })

  test("unchecking the copy clears the form", async ({ page }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const section = secondarySection(page)
    const displayName = section.locator("form").getByLabel("Nome de exibição")

    await section.getByLabel("Igual à carteira principal").check()
    await expect(displayName).toHaveValue("Segunda Conta")

    await section.getByLabel("Igual à carteira principal").uncheck()

    await expect(displayName).toHaveValue("")
  })

  test("a saved secondary wallet has no copy option", async ({ page }) => {
    await openWallets(page)
    const section = secondarySection(page)

    await expect(
      section.locator("form").getByLabel("Apelido da carteira")
    ).toHaveValue("Cofre secundário")
    await expect(section.getByLabel("Igual à carteira principal")).toHaveCount(
      0
    )
  })

  test("the primary address is rejected on the secondary wallet", async ({
    page,
  }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const primaryAddress = await primaryForm(page)
      .getByLabel("Endereço da carteira")
      .inputValue()
    const section = secondarySection(page)

    await section.getByLabel("Igual à carteira principal").check()
    await fillWalletSpecifics(page, section.locator("form"), primaryAddress)
    await section
      .locator("form")
      .getByRole("button", { name: "Salvar carteira" })
      .click()

    await expect(
      section.locator("form").getByLabel("Endereço da carteira")
    ).toHaveAccessibleDescription(
      "Este endereço já está na sua outra carteira."
    )
  })

  test("a copy saved with its own address shows and keeps what was saved", async ({
    page,
  }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const section = secondarySection(page)

    await section.getByLabel("Igual à carteira principal").check()
    const form = section.locator("form")
    await fillWalletSpecifics(page, form, VALID_ADDRESS)
    await form.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(page.getByText("Carteira salva.")).toBeVisible()
    await expect(form.getByLabel("Endereço da carteira")).toHaveValue(
      VALID_ADDRESS
    )
    await expect(form.getByLabel("Apelido da carteira")).toHaveValue(
      "Cofre reserva"
    )
    await expect(section.getByLabel("Igual à carteira principal")).toHaveCount(
      0
    )

    await page.reload()
    await expect(
      secondarySection(page).locator("form").getByLabel("Apelido da carteira")
    ).toHaveValue("Cofre reserva")
  })

  test("a secondary wallet can be filled by hand with selects", async ({
    page,
  }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const section = secondarySection(page)

    await section.getByRole("button", { name: "Adicionar" }).click()
    const form = section.locator("form")
    await form.getByLabel("Nome de exibição").fill("Reserva")
    await form.getByLabel("Apelido da carteira").fill("Cofre reserva")
    await selectOption(page, form.getByLabel("Rede"), "Polygon")
    await form.getByLabel("Nome do perfil").fill("second")
    await form.getByLabel("Endereço da carteira").fill(VALID_ADDRESS)
    await selectOption(page, form.getByLabel("Tipo de carteira"), "Coinbase")
    await form.getByLabel("Código de indicação").fill("KURIO")
    await form.getByRole("textbox", { name: "E-mail" }).fill(SECOND.email)
    await form.getByRole("textbox", { name: "Nome ENS" }).fill("reserva")
    await form.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(page.getByText("Carteira salva.")).toBeVisible()
    await page.reload()
    const saved = secondarySection(page).locator("form")
    await expect(saved.getByLabel("Endereço da carteira")).toHaveValue(
      VALID_ADDRESS
    )
    await expect(saved.getByLabel("Rede")).toHaveText(/Polygon/)
  })

  test("selects are required", async ({ page }) => {
    await login(page, SECOND)
    await page.goto("/wallets?panel=off")
    const section = secondarySection(page)

    await section.getByRole("button", { name: "Adicionar" }).click()
    await section.getByRole("button", { name: "Salvar carteira" }).click()

    await expect(section.getByLabel("Rede")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    await expect(section.getByLabel("Nome de exibição")).toBeFocused()
  })
})

test("account pages keep each user's data", async ({ page }) => {
  await openWallets(page, SECOND)
  await expect(page.getByLabel("Igual à carteira principal")).toBeVisible()
  await expect(page.getByText("collector@kurio.test")).toHaveCount(0)
  const values = await page
    .locator("input")
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value)
    )
  expect(values).not.toContain(COLLECTOR.email)
})

test("the account navigation is operable by keyboard", async ({ page }) => {
  await openProfile(page)
  const wallets = page
    .getByRole("navigation", { name: "Conta" })
    .getByRole("link", { name: "Carteiras" })

  await wallets.focus()
  await page.keyboard.press("Enter")

  await expect(page).toHaveURL(/\/wallets/)
  await expect(
    page.getByRole("heading", { name: "Carteira principal" })
  ).toBeVisible()
})

async function openWalletsAndReadOtherAddress(page: Page) {
  await openWallets(page)
  const state = (await page.evaluate(() =>
    (window as unknown as { __mocks: { state(): unknown } }).__mocks.state()
  )) as { wallets: { userId: string; address: string }[] }
  const other = state.wallets.find(({ userId }) => userId === "user-second")
  if (!other) throw new Error("seed has no wallet for the second user")
  return other.address
}
