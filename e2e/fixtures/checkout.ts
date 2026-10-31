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

export async function prepareCheckout(page: Page) {
  await openCheckout(page)
  await fillRequiredDetails(page)
  await goToWalletStep(page)
  await connect(page)
  await expect(confirmButton(page)).not.toHaveAttribute("aria-disabled")
}

export function review(page: Page) {
  return isMobile(page) ? page.getByRole("main") : page.getByRole("dialog")
}

export async function openReview(page: Page) {
  await confirmButton(page).click()
  await expect(
    isMobile(page)
      ? page.getByRole("heading", { name: /Revisão do pedido/ })
      : page.getByRole("heading", { name: "Revise seu pedido" })
  ).toBeVisible()
}

export async function placeOrder(page: Page) {
  await prepareCheckout(page)
  await openReview(page)
  await review(page).getByRole("button", { name: "Confirmar compra" }).click()
  await expect(page).toHaveURL(/\/orders\//)
}

export function receiptHeading(page: Page) {
  return page.getByRole("heading", {
    name: "Seus NFTs agora estão na sua carteira",
  })
}
