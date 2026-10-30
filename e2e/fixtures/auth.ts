import { expect, type Page } from "@playwright/test"

export const COLLECTOR = { email: "collector@kurio.test", password: "Kurio@123" }
export const SECOND = { email: "second@kurio.test", password: "Kurio@123" }

export function authDialog(page: Page) {
  return page.getByRole("dialog")
}

export async function submitLogin(
  page: Page,
  { email, password }: { email: string; password: string }
) {
  const dialog = authDialog(page)
  await dialog.getByLabel("E-mail").fill(email)
  await dialog.getByLabel("Senha", { exact: true }).fill(password)
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
}

export async function login(
  page: Page,
  credentials: { email: string; password: string } = COLLECTOR
) {
  await page.goto("/?auth=login")
  await submitLogin(page, credentials)
  await expect(authDialog(page)).toBeHidden()
}

export function storedToken(page: Page) {
  return page.evaluate(() => localStorage.getItem("kurio.session.token"))
}
