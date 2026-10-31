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
  await expect(
    page.getByRole("heading", { name: "Perfil do colecionador" })
  ).toBeVisible()
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
  await expect(
    dialog.getByLabel("Confirmar senha")
  ).toHaveAccessibleDescription("As senhas não coincidem")
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

test("return target keeps the query and drops auth params", async ({
  page,
}) => {
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

  await expect(
    page.getByRole("heading", { name: "Perfil do colecionador" })
  ).toBeVisible()
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
    await expect(
      page.getByRole("heading", { name: /Neon Vessel/ })
    ).toBeVisible()

    await mocks.scenario("session-expired")
    await page.getByRole("button", { name: /^Favoritar Neon Vessel/ }).click()

    await expect(authDialog(page).getByRole("alert")).toHaveText(
      "Sua sessão expirou. Entre novamente para continuar."
    )
    await expect(page).toHaveURL(
      /\/favorites\?auth=login&redirect=%2Ffavorites/
    )
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
    await expect(
      page.getByRole("heading", { name: /Neon Vessel/ })
    ).toBeVisible()
  })

  test("another user does not see the previous data", async ({
    page,
    mocks,
  }) => {
    await expireOnFavorites(page, mocks)

    await submitLogin(page, SECOND)

    await expect(authDialog(page)).toBeHidden()
    await expect(
      page.getByRole("heading", { name: /Sage Nomad/ })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /Emerald Ape/ })
    ).toHaveCount(0)
  })

  test("closing the dialog leaves the private page", async ({
    page,
    mocks,
  }) => {
    await expireOnFavorites(page, mocks)

    await page.keyboard.press("Escape")

    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(authDialog(page)).toBeHidden()
    await expect(
      page.getByRole("heading", { name: /^Favoritos$/ })
    ).toHaveCount(0)
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

test("expiry keeps a form in progress and it can be saved after login", async ({
  page,
  mocks,
}) => {
  await login(page, COLLECTOR)
  const profileLoaded = page.waitForResponse((response) =>
    response.url().endsWith("/api/profile")
  )
  await page.goto("/profile")
  await profileLoaded
  await waitForMocks(page)
  const displayName = page.getByLabel("Nome de exibição")
  await expect(displayName).toHaveValue("Colecionador Kurio")

  await displayName.fill("Rascunho em andamento")
  await mocks.scenario("session-expired")
  await page.getByRole("button", { name: "Salvar" }).click()

  await expect(authDialog(page).getByRole("alert")).toHaveText(
    "Sua sessão expirou. Entre novamente para continuar."
  )

  await submitLogin(page, COLLECTOR)

  await expect(authDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(displayName).toHaveValue("Rascunho em andamento")

  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Perfil atualizado.")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Rascunho em andamento"
  )
})

test("expiry during a combined save sends no password and keeps the draft", async ({
  page,
  mocks,
}) => {
  await login(page, COLLECTOR)
  const profileLoaded = page.waitForResponse((response) =>
    response.url().endsWith("/api/profile")
  )
  await page.goto("/profile")
  await profileLoaded
  await waitForMocks(page)
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Colecionador Kurio"
  )
  let passwordRequests = 0
  page.on("request", (request) => {
    if (request.url().endsWith("/api/profile/password")) passwordRequests += 1
  })
  await page.evaluate(() =>
    localStorage.setItem("kurio.pendingOrderId", "order-1")
  )

  await page.getByLabel("Nome de exibição").fill("Rascunho")
  await page.getByLabel("Senha atual").fill(COLLECTOR.password)
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha@123")
  await page.getByLabel("Confirmar nova senha").fill("NovaSenha@123")
  await mocks.scenario("session-expired")
  await page.getByRole("button", { name: "Salvar" }).click()

  await expect(authDialog(page).getByRole("alert")).toBeVisible()
  expect(passwordRequests).toBe(0)
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.pendingOrderId"))
  ).toBe("order-1")
  await expect(page.getByLabel("Senha atual")).toHaveValue(COLLECTOR.password)
})

test("expiry with another user drops the draft of the previous one", async ({
  page,
  mocks,
}) => {
  await login(page, COLLECTOR)
  const profileLoaded = page.waitForResponse((response) =>
    response.url().endsWith("/api/profile")
  )
  await page.goto("/profile")
  await profileLoaded
  await waitForMocks(page)
  const displayName = page.getByLabel("Nome de exibição")
  await expect(displayName).toHaveValue("Colecionador Kurio")

  await displayName.fill("Rascunho de A")
  await mocks.scenario("session-expired")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(authDialog(page).getByRole("alert")).toBeVisible()

  await submitLogin(page, SECOND)

  await expect(authDialog(page)).toBeHidden()
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Segunda Conta")
})

test("logout from the account navigation works in every viewport", async ({
  page,
}) => {
  await login(page, COLLECTOR)
  await page.goto("/profile?panel=off")

  await page
    .getByRole("navigation", { name: "Conta" })
    .getByRole("button", { name: "Sair" })
    .click()

  await expect(page).toHaveURL(/localhost:\d+\/$/)
  expect(await storedToken(page)).toBeNull()
  await page.goto("/wallets")
  await expect(page).toHaveURL(/auth=login/)
})

test("a session past 24 hours expires on the next private call", async ({
  page,
  mocks,
}) => {
  await login(page, COLLECTOR)
  const favoritesLoaded = page.waitForResponse((response) =>
    response.url().endsWith("/api/favorites")
  )
  await page.goto("/favorites")
  await favoritesLoaded
  await waitForMocks(page)
  await expect(page.getByRole("heading", { name: /Neon Vessel/ })).toBeVisible()

  await mocks.setClock("2026-09-17T12:00:00.000Z")
  await page.getByRole("button", { name: /^Favoritar Neon Vessel/ }).click()

  await expect(authDialog(page).getByRole("alert")).toHaveText(
    "Sua sessão expirou. Entre novamente para continuar."
  )
})

test("a private event stops reaching the app after logout", async ({
  page,
  mocks,
}) => {
  await page.addInitScript(() => {
    const target = window as unknown as { __orderEvents: number }
    target.__orderEvents = 0
    const dispatch = EventTarget.prototype.dispatchEvent
    EventTarget.prototype.dispatchEvent = function (event) {
      const { data } = event as MessageEvent
      if (typeof data === "string" && data.includes("order.updated")) {
        target.__orderEvents += 1
      }
      return dispatch.call(this, event)
    }
  })
  await login(page, COLLECTOR)
  await page.goto("/profile?panel=off")
  await waitForMocks(page)
  await expect
    .poll(async () => (await mocks.state()).mock.joinedConnectionCount)
    .toBe(1)
  await mocks.scenario("payment-pending-long")
  const orderId = await page.evaluate(async () => {
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("kurio.session.token")}`,
      "Content-Type": "application/json",
    }
    await fetch("/api/wallets/wallet-collector-primary/connect", {
      method: "POST",
      headers,
      body: JSON.stringify({ network: "ethereum" }),
    })
    const quote = await fetch("/api/quotes", {
      method: "POST",
      headers,
      body: JSON.stringify({ network: "ethereum" }),
    }).then((response) => response.json())
    const order = await fetch("/api/orders", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": "e2e-private-event" },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        walletId: "wallet-collector-primary",
        collector: {
          displayName: "Colecionador",
          username: "collector",
          email: "collector@kurio.test",
          profileName: "collector",
          ensName: null,
          secondaryAddress: null,
          referralCode: null,
          note: null,
        },
      }),
    }).then((response) => response.json())
    return order.id as string
  })
  const emit = (version: number) =>
    mocks.emitRaw({
      eventId: `e2e-${version}`,
      type: "order.updated",
      resourceId: orderId,
      version,
      data: { status: "pending", transactionRef: null },
    })
  const received = () =>
    page.evaluate(
      () => (window as unknown as { __orderEvents: number }).__orderEvents
    )

  const beforeControl = await received()
  await emit(50)
  await expect.poll(received).toBeGreaterThan(beforeControl)

  await page
    .getByRole("navigation", { name: "Conta" })
    .getByRole("button", { name: "Sair" })
    .click()
  await expect
    .poll(async () => {
      const { mock } = await mocks.state()
      return [mock.connectionCount, mock.joinedConnectionCount]
    })
    .toEqual([1, 0])

  const afterLogout = await received()
  await emit(51)
  await page.waitForTimeout(400)
  expect(await received()).toBe(afterLogout)
})

test("logout clears the session immediately while offline", async ({
  page,
  context,
}) => {
  await login(page, COLLECTOR)
  await page.getByRole("link", { name: "Meu perfil" }).click()
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Colecionador Kurio"
  )

  await context.setOffline(true)
  await page
    .getByRole("navigation", { name: "Conta" })
    .getByRole("button", { name: "Sair" })
    .click()

  await expect(page).toHaveURL(/localhost:\d+\/$/)
  expect(await storedToken(page)).toBeNull()
  await context.setOffline(false)
})

test("a failing session on boot does not show a logged user as visitor", async ({
  page,
  mocks,
}, testInfo) => {
  await login(page, COLLECTOR)
  await mocks.scenario("server-error")

  await page.goto("/?auth=login")
  await waitForMocks(page)
  await page.waitForTimeout(4000)

  await expect(authDialog(page)).toBeHidden()
  expect(await storedToken(page)).not.toBeNull()
  if (testInfo.project.name === "mobile") return

  const retry = page.getByRole("button", { name: /Recarregar$/ })
  await expect(retry).toBeVisible()
  await expect(page.getByRole("link", { name: "Entrar" })).toHaveCount(0)

  await mocks.scenario("default")
  await retry.click()

  await expect(
    page.getByRole("button", { name: /^Menu da conta/ })
  ).toBeVisible()
})

test("a redirect to an auth url drops the auth params", async ({ page }) => {
  await page.goto("/?auth=login&redirect=%2F%3Fauth%3Dlogin")

  await submitLogin(page, COLLECTOR)

  await expect(authDialog(page)).toBeHidden()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
})
