import { expect, test } from "./fixtures/mocks.ts"

const EMERALD = "/nft/emerald-ape-042?panel=off"
const LUNAR = "/nft/lunar-mirage-600?panel=off"

function isMobile() {
  return test.info().project.name === "mobile"
}

function editionRadio(page: import("@playwright/test").Page, label: RegExp) {
  return page.getByRole("radio", { name: label })
}

function visibleText(page: import("@playwright/test").Page, text: string) {
  return page.getByText(text).locator("visible=true").first()
}

function increase(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: "Aumentar quantidade" })
}

test("direct access renders the nft", async ({ page }) => {
  await page.goto(EMERALD)

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042"
  )
  await expect(visibleText(page, "Kurio Apes")).toBeVisible()
  await expect(visibleText(page, "1.19 ETH")).toBeVisible()
})

test("unknown nft shows its own 404 with a link to the catalog", async ({
  page,
}) => {
  await page.goto("/nft/inexistente?panel=off")

  await expect(
    page.getByRole("heading", { name: "NFT não encontrado" })
  ).toBeVisible()
  await page.getByRole("link", { name: "Ver catálogo" }).click()
  await expect(page).toHaveURL(/\/#catalog$/)
})

test("sold out edition is disabled and says so in text", async ({ page }) => {
  await page.goto(LUNAR)

  const soldOut = editionRadio(page, /^1\/1(?!0)/)
  await expect(soldOut).toHaveAttribute("aria-disabled", "true")
  await expect(soldOut).toContainText("Esgotada")
  await expect(editionRadio(page, /^1\/50/)).toHaveAttribute(
    "aria-checked",
    "true"
  )
})

test("plus stops at the limit with an explanation", async ({ page }) => {
  await page.goto(`${EMERALD}&edition=emerald-ape-042-1-10`)

  const plus = increase(page)
  for (let step = 0; step < 3; step += 1) await plus.click()

  await expect(plus).toBeDisabled()
  await expect(visibleText(page, "Limite de 4 por pedido")).toBeVisible()
  const hintId = await plus.getAttribute("aria-describedby")
  expect(hintId).toBeTruthy()
})

test("open edition stops at ten and switching adjusts the quantity", async ({
  page,
}) => {
  await page.goto(`${EMERALD}&edition=emerald-ape-042-open`)

  const plus = increase(page)
  for (let step = 0; step < 9; step += 1) await plus.click()
  await expect(plus).toBeDisabled()
  await expect(visibleText(page, "Limite de 10 por pedido")).toBeVisible()

  await editionRadio(page, /^1\/10/).click()

  await expect(page).toHaveURL(/edition=emerald-ape-042-1-10/)
  await expect(visibleText(page, "Limite de 4 por pedido")).toBeVisible()
  await expect(page.locator("output:visible")).toHaveText("4")
})

test("edition survives a reload", async ({ page }) => {
  await page.goto(EMERALD)
  await editionRadio(page, /^1\/50/).click()
  await expect(page).toHaveURL(/edition=emerald-ape-042-1-50/)

  await page.reload()

  await expect(editionRadio(page, /^1\/50/)).toHaveAttribute(
    "aria-checked",
    "true"
  )
})

test("invalid or sold out edition falls back and informs", async ({ page }) => {
  await page.goto(`${LUNAR}&edition=lunar-mirage-600-1-1`)

  await expect(editionRadio(page, /^1\/50/)).toHaveAttribute(
    "aria-checked",
    "true"
  )
  await expect(
    page.getByText("A edição pedida não está disponível")
  ).toBeVisible()
})

test("gallery changes the main image", async ({ page }) => {
  await page.goto(EMERALD)

  const main = page.locator('[data-testid="nft-gallery"] img[width="404"]')
  await expect(main).toHaveAttribute("alt", /Macaco de pelo castanho/)

  const thumbs = page.getByRole("button", { name: "Ver imagem 2 de 4" })
  await thumbs.click()

  await expect(main).toHaveAttribute("alt", /Gorila grisalho/)
  await expect(thumbs).toHaveAttribute("aria-current", "true")
})

test("zoom opens a dialog with the current image", async ({ page }) => {
  test.skip(isMobile(), "O frame mobile não tem lupa")
  await page.goto(EMERALD)

  await page.getByRole("button", { name: "Ampliar imagem" }).click()

  const dialog = page.getByRole("dialog", { name: "Emerald Ape #042" })
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "alt",
    /Macaco de pelo castanho/
  )
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
})

test("reviews load on their tab", async ({ page }) => {
  await page.goto(EMERALD)

  await page.getByRole("tab", { name: /Avaliações de colecionadores/ }).click()

  await expect(page.getByRole("tabpanel").getByRole("listitem")).toHaveCount(19)
})

test("collection carousel leaves out the current nft and navigates", async ({
  page,
}) => {
  await page.goto(EMERALD)

  const section = page.getByRole("region", { name: "Mais desta coleção" })
  await expect(section.getByRole("heading", { level: 3 }).first()).toBeVisible()
  await expect(section.getByText("Emerald Ape #042")).toBeHidden()

  const first = section.getByRole("heading", { level: 3 }).first()
  const name = await first.textContent()
  await first.click()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name ?? "")
})

test("mobile shows the buy bar instead of the tab bar", async ({ page }) => {
  test.skip(!isMobile(), "Layout próprio do mobile")
  await page.goto(EMERALD)

  await expect(page.getByRole("button", { name: "Comprar NFT" })).toBeVisible()
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" })
  ).toBeHidden()
  await expect(page.getByRole("button", { name: "Voltar" })).toBeHidden()
  await expect(page.getByRole("link", { name: /Voltar/ })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow).toBe(0)
})
