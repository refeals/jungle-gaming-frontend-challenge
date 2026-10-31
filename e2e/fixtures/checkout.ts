import { expect, type Page } from "@playwright/test"

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 768
}

export function field(page: Page, label: string) {
  const escaped = label.replace(/[()?]/g, "\\$&")
  return page.getByRole("main").getByLabel(new RegExp(`^${escaped}\\*?$`))
}

export function confirmButton(page: Page) {
  return page.getByRole("button", { name: "Confirmar compra" })
}

export async function openCheckout(page: Page) {
  await page.goto("/checkout?panel=off")
  await expect(field(page, "Nome de exibição")).toBeVisible()
}

export async function fillRequiredDetails(page: Page) {
  await field(page, "Código de indicação").fill("KURIO-1")
}

export async function goToWalletStep(page: Page) {
  if (!isMobile(page)) return
  await fillRequiredDetails(page)
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page).toHaveURL(/step=wallet/)
}

export async function connect(page: Page) {
  await page.getByRole("button", { name: "Conectar carteira" }).click()
  await expect(page.getByText(/^Conectada: /)).toBeVisible()
}
