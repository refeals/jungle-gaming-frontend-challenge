import { expect, test } from "./fixtures/mocks.ts"

test("slow catalog shows the skeleton without shifting the layout", async ({
  page,
  mocks,
}) => {
  await mocks.latency(2000)
  await page.goto("/?panel=off")

  const skeleton = page.getByTestId("catalog-skeleton")
  await expect(skeleton).toBeVisible()
  await expect(skeleton.locator(".shimmer").first()).toBeVisible()
  const catalog = page.locator("#catalog")
  const before = await catalog.boundingBox()
  const cardBefore = await skeleton.locator("> div").first().boundingBox()

  const grid = page.getByTestId("catalog-grid")
  await expect(grid).toBeVisible({ timeout: 10_000 })

  const after = await catalog.boundingBox()
  const cardAfter = await grid.locator("> div").first().boundingBox()
  expect(after?.y).toBe(before?.y)
  expect(cardAfter?.y).toBe(cardBefore?.y)
  expect(cardAfter?.height).toBeCloseTo(cardBefore?.height ?? 0, 0)
})

test("server error shows feedback and retry recovers", async ({
  page,
  mocks,
}) => {
  await mocks.scenario("server-error")
  await page.goto("/?panel=off")

  await expect(
    page.getByRole("heading", { name: "Não foi possível carregar os NFTs" })
  ).toBeVisible({ timeout: 15_000 })

  await mocks.scenario("default")
  await page.getByRole("button", { name: "Tentar novamente" }).click()

  await expect(page.getByTestId("catalog-grid")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Não foi possível carregar os NFTs" })
  ).toBeHidden()
})

test("reduced motion removes the shimmer animation", async ({
  page,
  mocks,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mocks.latency(2000)
  await page.goto("/?panel=off")

  const shimmer = page
    .getByTestId("catalog-skeleton")
    .locator(".shimmer")
    .first()
  await expect(shimmer).toBeVisible()
  const iterations = await shimmer.evaluate(
    (node) => getComputedStyle(node).animationIterationCount
  )
  expect(iterations).toBe("1")
})

test("slow detail shows the skeleton without shifting the gallery", async ({
  page,
  mocks,
}) => {
  await mocks.latency(2000)
  await page.goto("/nft/emerald-ape-042?panel=off")

  const skeleton = page.getByTestId("nft-detail-skeleton")
  await expect(skeleton).toBeVisible()
  const before = await page.getByTestId("nft-gallery").boundingBox()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042",
    { timeout: 10_000 }
  )
  await expect(skeleton).toBeHidden()

  const after = await page.getByTestId("nft-gallery").boundingBox()
  expect(after?.y).toBe(before?.y)
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 0)
})

test("detail server error recovers on retry", async ({ page, mocks }) => {
  await mocks.scenario("server-error")
  await page.goto("/nft/emerald-ape-042?panel=off")

  await expect(
    page.getByRole("heading", { name: "Não foi possível carregar este NFT" })
  ).toBeVisible({ timeout: 15_000 })

  await mocks.scenario("default")
  await page.getByRole("button", { name: "Tentar novamente" }).click()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042"
  )
})

test("newsletter chunk failing does not take the page down", async ({
  page,
}) => {
  await page
    .context()
    .route(/assets\/newsletter-form-.*\.js$/, (route) => route.abort())
  await page.goto("/?panel=off")

  await expect(
    page.getByText("Não foi possível carregar o formulário")
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByText("Algo deu errado")).toBeHidden()
})

test("auth dialog chunk failing does not take the page down", async ({
  page,
}) => {
  await page
    .context()
    .route(/assets\/auth-dialog-.*\.js$/, (route) => route.abort())
  await page.goto("/?panel=off&auth=login")

  await expect(page.getByText("Não foi possível abrir o login")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText("Algo deu errado")).toBeHidden()
})
