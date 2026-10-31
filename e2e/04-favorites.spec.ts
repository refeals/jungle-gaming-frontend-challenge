import type { Page } from "@playwright/test"

import { COLLECTOR, login, SECOND, submitLogin } from "./fixtures/auth.ts"
import { expect, test, waitForMocks } from "./fixtures/mocks.ts"

const DETAIL = "/nft/sage-nomad-009?panel=off"

function favoriteOnDetail(page: Page) {
  return page
    .getByRole("button", { name: "Favoritar Sage Nomad #009" })
    .filter({ visible: true })
}

async function openDetail(page: Page) {
  await page.goto(DETAIL)
  await waitForMocks(page)
  const button = favoriteOnDetail(page)
  await expect(button).toHaveAttribute("aria-pressed", "false")
  await expect(button).not.toHaveAttribute("aria-disabled", "true")
  return button
}

test("favoriting persists after refresh and can be undone", async ({
  page,
}) => {
  await login(page)
  const button = await openDetail(page)

  await button.click()
  await expect(button).toHaveAttribute("aria-pressed", "true")

  await page.reload()
  await expect(favoriteOnDetail(page)).toHaveAttribute("aria-pressed", "true")

  await favoriteOnDetail(page).click()
  await expect(favoriteOnDetail(page)).toHaveAttribute("aria-pressed", "false")

  await page.reload()
  await expect(favoriteOnDetail(page)).toHaveAttribute("aria-pressed", "false")
})

test("the card shows and changes the favorite state", async ({ page }) => {
  await login(page)
  await page.goto("/?panel=off")

  const button = page.getByRole("button", {
    name: "Favoritar Emerald Ape #042",
  })
  await expect(button).toHaveAttribute("aria-pressed", "true")

  await button.click()

  await expect(button).toHaveAttribute("aria-pressed", "false")
})

test("a favorite is visible only to its owner", async ({ page }) => {
  await login(page, SECOND)
  await page.goto("/favorites?panel=off")

  await expect(page.getByRole("heading", { name: /Sage Nomad/ })).toBeVisible()
  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toHaveCount(
    0
  )
})

test("logging out and in as another user shows only the new favorites", async ({
  page,
}) => {
  await login(page, COLLECTOR)
  await page.getByRole("link", { name: "Lista de interesse" }).click()
  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toBeVisible()

  await page.getByRole("link", { name: "Meu perfil" }).click()
  await page
    .getByRole("navigation", { name: "Conta" })
    .getByRole("button", { name: "Sair" })
    .click()
  await expect(page).toHaveURL(/localhost:\d+\/$/)

  await page.getByRole("link", { name: "Lista de interesse" }).click()
  await submitLogin(page, SECOND)

  await expect(page.getByRole("heading", { name: /Sage Nomad/ })).toBeVisible()
  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toHaveCount(
    0
  )
})

test("a reconnection during a mutation keeps the optimistic state", async ({
  page,
  mocks,
}) => {
  await login(page)
  const button = await openDetail(page)
  await mocks.latency(3000)

  await button.click()
  await expect(button).toHaveAttribute("aria-pressed", "true")
  await mocks.latency(0)
  await mocks.dropConnection()
  await mocks.restoreConnection()
  await expect
    .poll(async () => (await mocks.state()).mock.joinedConnectionCount, {
      timeout: 10_000,
    })
    .toBe(1)

  await expect(button).toHaveAttribute("aria-pressed", "true")
  await expect(button).not.toHaveAttribute("aria-disabled", "true", {
    timeout: 10_000,
  })
  await expect(button).toHaveAttribute("aria-pressed", "true")
})

test("back after logging in from the heart leaves the page", async ({
  page,
}) => {
  await page.goto("/?panel=off")
  await page.goto(DETAIL)
  await favoriteOnDetail(page).click()
  await submitLogin(page, COLLECTOR)
  await expect(page.getByRole("dialog")).toBeHidden()

  await page.goBack()

  await expect(page).toHaveURL(/localhost:\d+\/(\?panel=off)?$/)
})

test("removing a card keeps focus on the page and announces the count", async ({
  page,
}) => {
  await login(page)
  await page.goto("/favorites?panel=off")

  await page.getByRole("button", { name: /^Favoritar Emerald Ape/ }).focus()
  await page.keyboard.press("Enter")

  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toHaveCount(
    0
  )
  await expect(page.getByRole("heading", { name: "Favoritos" })).toBeFocused()
  await expect(
    page.getByRole("status").filter({ hasText: "1 favorito" })
  ).toBeAttached()
})

test("a click before the favorites load sends no wrong change", async ({
  page,
  mocks,
}) => {
  await login(page)
  await page.goto("/nft/emerald-ape-042?panel=off")
  await waitForMocks(page)
  await mocks.latency(1500)
  await page.reload()

  const button = page
    .getByRole("button", { name: "Favoritar Emerald Ape #042" })
    .filter({ visible: true })
  await expect(button).toHaveAttribute("aria-disabled", "true")
  await button.click({ force: true })

  await expect(button).not.toHaveAttribute("aria-disabled", "true")
  await expect(button).toHaveAttribute("aria-pressed", "true")
  await mocks.latency(0)
  await page.reload()
  await expect(
    page
      .getByRole("button", { name: "Favoritar Emerald Ape #042" })
      .filter({ visible: true })
  ).toHaveAttribute("aria-pressed", "true")
})

test("favorite-fails reverts the icon, warns, and recovers", async ({
  page,
  mocks,
}) => {
  await login(page)
  const button = await openDetail(page)
  await mocks.scenario("favorite-fails")
  await mocks.latency(400)

  await button.click()

  await expect(button).toHaveAttribute("aria-pressed", "true")
  await expect(button).toHaveAttribute("aria-pressed", "false")
  await expect(
    page.getByText("Não foi possível atualizar seus favoritos")
  ).toBeVisible()

  await mocks.scenario("default")
  await mocks.latency(0)
  await button.click()

  await expect(button).toHaveAttribute("aria-pressed", "true")
  await page.reload()
  await expect(favoriteOnDetail(page)).toHaveAttribute("aria-pressed", "true")
})

test("repeated clicks during a mutation do not flip the state", async ({
  page,
  mocks,
}) => {
  await login(page)
  const button = await openDetail(page)
  await mocks.latency(1500)

  await button.click()
  await expect(button).toHaveAttribute("aria-disabled", "true")
  await button.click({ force: true })
  await button.click({ force: true })
  await expect(button).toHaveAttribute("aria-pressed", "true")

  await expect(button).not.toHaveAttribute("aria-disabled", "true")
  await expect(button).toHaveAttribute("aria-pressed", "true")
  await mocks.latency(0)
  await page.reload()
  await expect(favoriteOnDetail(page)).toHaveAttribute("aria-pressed", "true")
})

test("a visitor is sent to login and the favorite is not applied", async ({
  page,
}) => {
  await openDetail(page)

  await favoriteOnDetail(page).click()

  await expect(page).toHaveURL(/auth=login/)
  await expect(page).toHaveURL(/redirect=/)
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("E-mail").fill(COLLECTOR.email)
  await dialog.getByLabel("Senha", { exact: true }).fill(COLLECTOR.password)
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/nft\/sage-nomad-009/)
  await expect(favoriteOnDetail(page)).toHaveAttribute("aria-pressed", "false")
})

test("the page lists favorites and removes them in place", async ({ page }) => {
  await login(page)
  await page.goto("/favorites?panel=off")

  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toBeVisible()
  await expect(page.getByRole("heading", { name: /Neon Vessel/ })).toBeVisible()

  await page.getByRole("button", { name: /^Favoritar Emerald Ape/ }).click()

  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toHaveCount(
    0
  )
  await expect(page.getByRole("heading", { name: /Neon Vessel/ })).toBeVisible()
})

test("the page shows the empty state with a link to the catalog", async ({
  page,
}) => {
  await login(page, SECOND)
  await page.goto("/favorites?panel=off")

  await page.getByRole("button", { name: /^Favoritar Sage Nomad/ }).click()

  await expect(
    page.getByRole("heading", { name: "Nenhum favorito por aqui" })
  ).toBeVisible()
  await page.getByRole("link", { name: "Explorar o catálogo" }).click()
  await expect(page).toHaveURL(/#catalog$/)
})

test("the page shows a skeleton while loading and retries after a failure", async ({
  page,
  mocks,
}) => {
  await login(page)
  await mocks.latency(600)

  await page.getByRole("link", { name: "Lista de interesse" }).click()
  await expect(page.getByTestId("catalog-skeleton")).toBeVisible()
  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toBeVisible()

  await mocks.latency(0)
  await mocks.scenario("server-error")
  await page.reload()
  await waitForMocks(page)
  await expect(
    page.getByRole("alert").filter({ hasText: /Tentar novamente/ })
  ).toBeVisible({ timeout: 15_000 })

  await mocks.scenario("default")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.getByRole("heading", { name: /Emerald Ape/ })).toBeVisible()
})
