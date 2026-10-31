import { existsSync } from "node:fs"

import type { Page } from "@playwright/test"

import { login } from "./fixtures/auth.ts"
import { field } from "./fixtures/checkout.ts"
import { expect, test, type Mocks } from "./fixtures/mocks.ts"

const FIXED_TIME = new Date("2026-09-15T12:00:00.000Z")

async function loadEveryImage(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => {
        image.loading = "eager"
        return image.decode()
      })
    )
  )
}

async function settle(page: Page, mocks: Mocks) {
  await expect
    .poll(async () => (await mocks.state()).mock.connectionCount)
    .toBeGreaterThan(0)
  await expect(page.locator(".shimmer")).toHaveCount(0)
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await loadEveryImage(page)
  await page.mouse.move(0, 0)
}

async function expectPage(page: Page, mocks: Mocks, name: string) {
  const testInfo = test.info()
  test.skip(
    process.platform !== "linux" &&
      testInfo.config.updateSnapshots === "missing" &&
      !existsSync(testInfo.snapshotPath(name, { kind: "screenshot" })),
    "Baselines versionadas são de Linux. Gere as deste SO com pnpm test:e2e:update"
  )
  await settle(page, mocks)
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: "disabled",
  })
}

test.beforeEach(async ({ page, mocks }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await mocks.reset()
})

test("home", async ({ page, mocks }) => {
  await page.goto("/?panel=off")
  await expect(page.getByTestId("catalog-grid")).toBeVisible()

  await expectPage(page, mocks, "home.png")
})

test("detail", async ({ page, mocks }) => {
  await page.goto("/nft/emerald-ape-042?panel=off")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Emerald Ape #042"
  )

  await expectPage(page, mocks, "detail.png")
})

test("cart", async ({ page, mocks }) => {
  await login(page)
  await page.goto("/cart?panel=off")
  await expect(page.getByText("26.846 ETH").first()).toBeVisible()

  await expectPage(page, mocks, "cart.png")
})

test("payment", async ({ page, mocks }) => {
  await login(page)
  await page.goto("/checkout?panel=off&step=details")
  await expect(field(page, "Nome de exibição")).not.toHaveValue("")

  await expectPage(page, mocks, "payment.png")
})
