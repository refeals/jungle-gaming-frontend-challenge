import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures/mocks.ts"

function gridNames(page: Page) {
  return page.getByTestId("catalog-grid").getByRole("heading")
}

async function gridPrices(page: Page) {
  const prices = await page
    .getByTestId("catalog-grid")
    .locator("p > span:first-child")
    .allTextContents()
  return prices.map((price) => Number.parseFloat(price))
}

function isMobile() {
  return test.info().project.name === "mobile"
}

async function fillSearch(page: Page, term: string) {
  if (!isMobile()) {
    const input = page.getByRole("searchbox", { name: "Buscar NFTs" }).first()
    if (!(await input.isVisible())) {
      await page.getByRole("button", { name: "Buscar", exact: true }).click()
    }
  }
  await page.getByRole("searchbox", { name: "Buscar NFTs" }).last().fill(term)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?panel=off")
  await expect(gridNames(page).first()).toBeVisible()
})

test("search updates the url and the result without a history entry per letter", async ({
  page,
}) => {
  await page.goto("/?tab=trending")
  await page.goto("/")
  await fillSearch(page, "Emerald")

  await expect(page).toHaveURL(/q=Emerald/)
  await expect(gridNames(page)).toHaveText(["Emerald Ape #042"])

  await page.goBack()
  await expect(page).toHaveURL(/tab=trending/)
})

test("collection, network and price combine with coherent facets", async ({
  page,
}) => {
  test.skip(isMobile(), "O drawer tem teste próprio")

  await page.getByRole("button", { name: /^Arte digital/ }).click()
  await expect(page).toHaveURL(/collection=digital-art/)

  const ethereum = page.getByRole("button", { name: /^Ethereum/ })
  await expect(ethereum).toHaveText(/\(\d+\)/)
  const ethereumCount = (await ethereum.textContent())?.match(/\((\d+)\)/)?.[1]

  await ethereum.click()
  await expect(page).toHaveURL(/network=ethereum/)
  await expect(
    page.getByRole("status").filter({ hasText: "encontrados" })
  ).toHaveText(`${ethereumCount} NFTs encontrados`)

  const before = await gridNames(page).allTextContents()
  await page.getByRole("slider", { name: "Preço máximo" }).press("ArrowLeft")
  await expect(page).not.toHaveURL(/maxPrice/)
  expect(await gridNames(page).allTextContents()).toEqual(before)

  await page.getByRole("button", { name: "Aplicar" }).click()
  await expect(page).toHaveURL(/maxPrice=\d+\.\d{2}/)
  await expect(page).toHaveURL(/collection=digital-art/)
  await expect(page).toHaveURL(/network=ethereum/)
})

test("changing a filter returns to the first page", async ({ page }) => {
  await page.goto("/?page=2")
  await expect(page.getByRole("link", { name: "Página 2" })).toHaveAttribute(
    "aria-current",
    "page"
  )

  await page.getByRole("link", { name: "Em alta" }).click()

  await expect(page).toHaveURL(/tab=trending/)
  await expect(page).not.toHaveURL(/page=/)
})

test("sorting by price orders the grid", async ({ page }) => {
  await page.goto("/?sort=price-asc")
  await expect.poll(async () => (await gridPrices(page))[0]).toBe(0.02)
  const prices = await gridPrices(page)
  expect(prices).toEqual([...prices].sort((left, right) => left - right))

  await page.goto("/?sort=price-desc")
  await expect.poll(async () => (await gridPrices(page))[0]).toBe(12.3)
})

test("sort control writes the url", async ({ page }) => {
  test.skip(isMobile(), "No mobile a ordenação fica no drawer")

  await page.getByRole("combobox", { name: "Ordenar por" }).click()
  await page.getByRole("option", { name: "Maior preço" }).click()

  await expect(page).toHaveURL(/sort=price-desc/)
  await expect.poll(async () => (await gridPrices(page))[0]).toBe(12.3)
})

test("pagination moves forward and back", async ({ page }) => {
  const firstPage = await gridNames(page).allTextContents()

  await page.getByRole("link", { name: "Próxima página" }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(gridNames(page).first()).not.toHaveText(firstPage[0])

  await page.getByRole("link", { name: "Página anterior" }).click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(gridNames(page).first()).toHaveText(firstPage[0])
})

test("reload and history restore the combination", async ({ page }) => {
  await page.goto("/?collection=digital-art&sort=name")
  await expect(gridNames(page).first()).toBeVisible()
  const names = await gridNames(page).allTextContents()

  await page.reload()
  await expect(page).toHaveURL(/collection=digital-art/)
  await expect(page).toHaveURL(/sort=name/)
  await expect(gridNames(page).first()).toHaveText(names[0])

  await page.getByRole("link", { name: "Novos lançamentos" }).click()
  await expect(page).toHaveURL(/tab=new/)
  await page.getByRole("link", { name: "Em alta" }).click()
  await expect(page).toHaveURL(/tab=trending/)

  await page.goBack()
  await expect(page).toHaveURL(/tab=new/)
  await page.goBack()
  await expect(page).not.toHaveURL(/tab=/)
  await expect(gridNames(page).first()).toHaveText(names[0])
  await page.goForward()
  await expect(page).toHaveURL(/tab=new/)
  await expect(page).toHaveURL(/sort=name/)
})

test("price in the url stays a decimal string", async ({ page }) => {
  await page.goto("/?minPrice=12.30")

  await expect(page).toHaveURL(/minPrice=12\.30/)
  await expect.poll(async () => (await gridPrices(page))[0]).toBe(12.3)
})

test("invalid params fall back and a page past the end moves to the last", async ({
  page,
}) => {
  await page.goto("/?tab=xxx&sort=yyy&minPrice=abc&page=-1")
  await expect(gridNames(page)).toHaveCount(9)

  await page.goto("/?page=99")
  await expect(page).toHaveURL(/page=7/)
  await expect(gridNames(page).first()).toBeVisible()
})

test("empty result offers to clear the filters", async ({ page }) => {
  await page.goto("/?q=sem-resultado")
  await expect(
    page.getByRole("heading", { name: "Nenhum NFT encontrado" })
  ).toBeVisible()

  await page.getByRole("button", { name: "Limpar filtros" }).click()

  await expect(page).not.toHaveURL(/q=/)
  await expect(gridNames(page)).toHaveCount(9)
})

test("empty-catalog scenario shows the empty state", async ({
  page,
  mocks,
}) => {
  await mocks.scenario("empty-catalog")
  await page.reload()

  await expect(
    page.getByRole("heading", { name: "Nenhum NFT encontrado" })
  ).toBeVisible()
  await expect(page.getByTestId("catalog-grid")).toBeHidden()
})

test("out-of-order search ends on the last term", async ({ page, mocks }) => {
  await mocks.scenario("out-of-order")

  await fillSearch(page, "a")
  await expect(page).toHaveURL(/q=a/)
  await fillSearch(page, "ap")
  await expect(page).toHaveURL(/q=ap/)

  await expect(gridNames(page)).toHaveText(["Emerald Ape #042"])
  await page.waitForTimeout(1800)
  await expect(gridNames(page)).toHaveText(["Emerald Ape #042"])
})

test("mobile drawer traps focus and applies everything at once", async ({
  page,
}) => {
  test.skip(!isMobile(), "O drawer só aparece abaixo de lg")

  const trigger = page.getByRole("button", { name: "Abrir filtros" }).first()
  await trigger.click()
  const drawer = page.getByRole("dialog", { name: "Filtros" })
  await expect(drawer).toBeVisible()

  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab")
    const inside = await drawer.evaluate((node) =>
      node.contains(document.activeElement)
    )
    expect(inside).toBe(true)
  }

  await drawer.getByRole("button", { name: /^Música/ }).click()
  await expect(page).not.toHaveURL(/collection=/)

  await drawer.getByRole("button", { name: "Aplicar" }).click()

  await expect(drawer).toBeHidden()
  await expect(page).toHaveURL(/collection=music/)
  await expect(trigger).toBeFocused()
})

test("typing in the header search outside the home does not filter on arrival", async ({
  page,
}) => {
  test.skip(isMobile(), "O header fica oculto no mobile")

  await page.goto("/nft/emerald-ape-042?panel=off")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await page.getByRole("searchbox", { name: "Buscar NFTs" }).fill("abc")

  await page.getByRole("link", { name: "Início", exact: true }).first().click()
  await expect(gridNames(page).first()).toBeVisible()
  await page.waitForTimeout(500)

  await expect(page).not.toHaveURL(/q=/)
})

test("going back from a detail restores the catalog scroll", async ({
  page,
}) => {
  const card = page.getByRole("article").nth(6)
  await card.scrollIntoViewIfNeeded()
  const scrolled = await page.evaluate(() => window.scrollY)
  expect(scrolled).toBeGreaterThan(0)

  await card.getByRole("link").click()
  await expect(page).toHaveURL(/\/nft\//)
  await page.goBack()

  await expect(gridNames(page).first()).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(scrolled - 50)
})

test("drawer facets follow the draft selection", async ({ page }) => {
  test.skip(!isMobile(), "O drawer só aparece abaixo de lg")

  await page.goto("/?network=polygon")
  await page.getByRole("button", { name: "Abrir filtros" }).first().click()
  const drawer = page.getByRole("dialog", { name: "Filtros" })
  await expect(
    drawer.getByRole("button", { name: /^Arte digital/ })
  ).toBeDisabled()

  await drawer.getByRole("button", { name: /^Ethereum/ }).click()

  await expect(
    drawer.getByRole("button", { name: /^Arte digital/ })
  ).toBeEnabled()
})
