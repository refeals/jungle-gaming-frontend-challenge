import type { Page } from "@playwright/test"

import {
  authDialog,
  COLLECTOR,
  login,
  SECOND,
  storedToken,
  submitLogin,
} from "./fixtures/auth.ts"
import { expect, test, waitForMocks, type Mocks } from "./fixtures/mocks.ts"

const NEW_ACCOUNT = {
  username: "nova-conta",
  email: "nova@kurio.test",
  password: "Senha@123",
}

test("valid registration creates a session", async ({ page }) => {
  await page.goto("/?auth=register")
  const dialog = authDialog(page)

  await dialog.getByLabel("Nome de usuário").fill(NEW_ACCOUNT.username)
  await dialog.getByLabel("E-mail").fill(NEW_ACCOUNT.email)
  await dialog.getByLabel("Senha", { exact: true }).fill(NEW_ACCOUNT.password)
  await dialog.getByLabel("Confirmar senha").fill(NEW_ACCOUNT.password)
  await dialog.locator("button[type=submit]").click()

  await expect(dialog).toBeHidden()
  expect(await storedToken(page)).not.toBeNull()

  await page.goto("/profile")
  await expect(page.getByRole("heading", { name: "Perfil", exact: true })).toBeVisible()
})

test("invalid registration shows associated errors", async ({ page }) => {
  await page.goto("/?auth=register")
  const dialog = authDialog(page)

  await dialog.getByLabel("E-mail").fill("invalido")
  await dialog.getByLabel("Senha", { exact: true }).fill("curta")
  await dialog.getByLabel("Confirmar senha").fill("outra")
  await dialog.locator("button[type=submit]").click()

  const username = dialog.getByLabel("Nome de usuário")
  await expect(username).toHaveAttribute("aria-invalid", "true")
  await expect(username).toHaveAccessibleDescription("Campo obrigatório")
  await expect(username).toBeFocused()
  await expect(dialog.getByLabel("E-mail")).toHaveAccessibleDescription(
    "E-mail inválido"
  )
  await expect(
    dialog.getByLabel("Senha", { exact: true })
  ).toHaveAccessibleDescription("Use ao menos 8 caracteres")
  await expect(dialog.getByLabel("Confirmar senha")).toHaveAccessibleDescription(
    "As senhas não coincidem"
  )
})

test("register-conflict shows the error on the email field", async ({
  page,
  mocks,
}) => {
  await page.goto("/?auth=register")
  await waitForMocks(page)
  await mocks.scenario("register-conflict")
  const dialog = authDialog(page)

  await dialog.getByLabel("Nome de usuário").fill(NEW_ACCOUNT.username)
  await dialog.getByLabel("E-mail").fill(NEW_ACCOUNT.email)
  await dialog.getByLabel("Senha", { exact: true }).fill(NEW_ACCOUNT.password)
  await dialog.getByLabel("Confirmar senha").fill(NEW_ACCOUNT.password)
  await dialog.locator("button[type=submit]").click()

  const email = dialog.getByLabel("E-mail")
  await expect(email).toHaveAccessibleDescription(
    "Este e-mail já está cadastrado."
  )
  await expect(email).toBeFocused()
  expect(await storedToken(page)).toBeNull()
})

test("invalid login shows an error and stays in the dialog", async ({
  page,
}) => {
  await page.goto("/?auth=login")

  await submitLogin(page, { email: COLLECTOR.email, password: "errada" })

  const dialog = authDialog(page)
  await expect(dialog.getByRole("alert")).toHaveText(
    "E-mail ou senha incorretos."
  )
  await expect(dialog).toBeVisible()
  expect(await storedToken(page)).toBeNull()
})

test("password can be shown and hidden", async ({ page }) => {
  await page.goto("/?auth=login")
  const dialog = authDialog(page)
  const password = dialog.getByLabel("Senha", { exact: true })
  const toggle = dialog.getByRole("button", { name: "Mostrar senha" })

  await expect(password).toHaveAttribute("type", "password")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "true")
  await expect(password).toHaveAttribute("type", "text")
})

for (const path of ["/profile", "/wallets", "/favorites"]) {
  test(`${path} sends a visitor to login and comes back`, async ({ page }) => {
    await page.goto(path)

    await expect(page).toHaveURL(/auth=login/)
    await expect(page).toHaveURL(new RegExp(`redirect=%2F${path.slice(1)}`))

    await submitLogin(page, COLLECTOR)

    await expect(authDialog(page)).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
  })
}

test("return target keeps the query and drops auth params", async ({ page }) => {
  await page.goto("/profile?tab=a&auth=register")

  await expect(page).toHaveURL(/auth=login/)
  await submitLogin(page, COLLECTOR)

  await expect(page).toHaveURL(/\/profile\?tab=a$/)
})

test("external redirect is ignored after login", async ({ page }) => {
  await page.goto("/?auth=login&redirect=//evil.example")

  await submitLogin(page, COLLECTOR)

  await expect(authDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
})

test("refresh keeps the session", async ({ page }) => {
  await login(page)

  await page.goto("/profile")
  await page.reload()

  await expect(page.getByRole("heading", { name: "Perfil", exact: true })).toBeVisible()
  await expect(authDialog(page)).toBeHidden()
})

test("a logged in user never sees the dialog and leaves the auth params", async ({
  page,
}) => {
  await login(page)

  await page.goto("/?auth=login")

  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await expect(authDialog(page)).toBeHidden()
})

test("a logged in user follows the redirect target", async ({ page }) => {
  await login(page)

  await page.goto("/?auth=register&redirect=/profile")

  await expect(page).toHaveURL(/\/profile$/)
  await expect(authDialog(page)).toBeHidden()
})

test("a session past 24 hours falls back to visitor on boot", async ({
  page,
  mocks,
}) => {
  await login(page)
  await mocks.setClock("2026-09-17T12:00:00.000Z")

  await page.goto("/profile")

  await expect(page).toHaveURL(/auth=login/)
  expect(await storedToken(page)).toBeNull()
})

test("the socket joins after login", async ({ page, mocks }) => {
  await login(page)

  await expect
    .poll(async () => (await mocks.state()).mock.joinedConnectionCount)
    .toBe(1)
})

test("the socket joins after reload with a stored session", async ({
  page,
  mocks,
}) => {
  await login(page)
  await page.reload()
  await waitForMocks(page)

  await expect
    .poll(async () => (await mocks.state()).mock.joinedConnectionCount)
    .toBe(1)
})

test.describe("account menu", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "header is hidden")

  const accountMenu = (page: Page) =>
    page.getByRole("button", { name: /^Menu da conta/ })

  test("logout clears the session and the socket join", async ({
    page,
    mocks,
  }) => {
    await login(page)
    await expect
      .poll(async () => (await mocks.state()).mock.joinedConnectionCount)
      .toBe(1)

    await page.goto("/profile")
    await accountMenu(page).click()
    await page.getByRole("menuitem", { name: "Sair" }).click()

    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
    expect(await storedToken(page)).toBeNull()
    await expect
      .poll(async () => {
        const { mock } = await mocks.state()
        return [mock.connectionCount, mock.joinedConnectionCount]
      })
      .toEqual([1, 0])
    await expect(page.getByText("Reconectando...")).toBeHidden()

    await page.goto("/profile")
    await expect(page).toHaveURL(/auth=login/)
  })

  test("logout on a public page stays there", async ({ page }) => {
    await login(page)

    await page.goto("/cart")
    await accountMenu(page).click()
    await page.getByRole("menuitem", { name: "Sair" }).click()

    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
    await expect(page).toHaveURL(/\/cart$/)
  })

  test("the menu links to the account pages", async ({ page }) => {
    await login(page)

    await accountMenu(page).click()
    await page.getByRole("menuitem", { name: "Carteiras" }).click()

    await expect(page).toHaveURL(/\/wallets$/)
  })

  test("switching user keeps only the new session", async ({ page }) => {
    await login(page, COLLECTOR)
    const firstToken = await storedToken(page)
    await accountMenu(page).click()
    await page.getByRole("menuitem", { name: "Sair" }).click()
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()

    await page.getByRole("link", { name: "Entrar" }).click()
    await submitLogin(page, SECOND)

    await expect(accountMenu(page)).toHaveAccessibleName(/Segunda Conta/)
    expect(await storedToken(page)).not.toBe(firstToken)
  })

})

test.describe("session expiring on a private page", () => {
  async function expireOnFavorites(page: Page, mocks: Mocks) {
    await login(page, COLLECTOR)
    const favoritesLoaded = page.waitForResponse((response) =>
      response.url().endsWith("/api/favorites")
    )
    await page.goto("/favorites")
    await favoritesLoaded
    await waitForMocks(page)
    await expect(page.getByRole("heading", { name: /Neon Vessel/ })).toBeVisible()

    await mocks.scenario("session-expired")
    await page.getByRole("button", { name: /^Favoritar Neon Vessel/ }).click()

    await expect(authDialog(page).getByRole("alert")).toHaveText(
      "Sua sessão expirou. Entre novamente para continuar."
    )
    await expect(page).toHaveURL(/\/favorites\?auth=login&redirect=%2Ffavorites/)
  }

  test("the page stays behind the dialog and resumes after login", async ({
    page,
    mocks,
  }) => {
    await expireOnFavorites(page, mocks)

    await expect(
      page.getByRole("heading", { name: "Favoritos", includeHidden: true })
    ).toBeAttached()
    expect(await storedToken(page)).toBeNull()
    await expect(
      page.getByText("Não foi possível atualizar seus favoritos")
    ).toBeHidden()

    await submitLogin(page, COLLECTOR)

    await expect(authDialog(page)).toBeHidden()
    await expect(page).toHaveURL(/\/favorites$/)
    await expect(page.getByRole("heading", { name: /Neon Vessel/ })).toBeVisible()
  })

  test("another user does not see the previous data", async ({
    page,
    mocks,
  }) => {
    await expireOnFavorites(page, mocks)

    await submitLogin(page, SECOND)

    await expect(authDialog(page)).toBeHidden()
    await expect(page.getByRole("heading", { name: /Sage Nomad/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toHaveCount(0)
  })

  test("closing the dialog leaves the private page", async ({ page, mocks }) => {
    await expireOnFavorites(page, mocks)

    await page.keyboard.press("Escape")

    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(authDialog(page)).toBeHidden()
    await expect(page.getByRole("heading", { name: /^Favoritos$/ })).toHaveCount(0)
  })

  test("going back clears the expired state", async ({ page, mocks }) => {
    await expireOnFavorites(page, mocks)

    await page.goBack()

    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(authDialog(page)).toBeHidden()

    await page.goForward()

    await expect(page).toHaveURL(/redirect=/)
    await expect(authDialog(page)).toBeVisible()
    await expect(authDialog(page).getByRole("alert")).toHaveCount(0)
  })
})

test("session-expired on a public page falls back to visitor", async ({
  page,
  mocks,
}) => {
  await login(page, COLLECTOR)
  await mocks.scenario("session-expired")

  await page.getByRole("button", { name: /^Favoritar Emerald Ape/ }).click()

  await expect(
    page.getByText("Sua sessão expirou. Entre novamente.")
  ).toBeVisible()
  await expect(authDialog(page)).toBeHidden()
  expect(await storedToken(page)).toBeNull()
})

