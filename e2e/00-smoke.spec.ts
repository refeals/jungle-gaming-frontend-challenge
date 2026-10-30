import { expect, test } from "@playwright/test"

test("unknown route shows the not found screen", async ({ page }) => {
  await page.goto("/nao-existe")

  await expect(
    page.getByRole("heading", { name: "Página não encontrada" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Voltar para o início" })
  ).toHaveAttribute("href", "/")
})

test("/login redirects and opens the dialog", async ({ page }) => {
  await page.goto("/login?redirect=/cart")

  await expect(page).toHaveURL(/auth=login/)
  await expect(page).toHaveURL(/redirect=/)
  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible()
})

test("/register redirects and opens the dialog", async ({ page }) => {
  await page.goto("/register")

  await expect(page).toHaveURL(/auth=register/)
  await expect(page.getByRole("dialog", { name: "Criar conta" })).toBeVisible()
})

for (const target of [
  "//evil.example",
  "/%5Cevil.example",
  "/%09/evil.example",
  "/.//evil.example",
]) {
  test(`external redirect target ${target} is dropped`, async ({ page }) => {
    await page.goto(`/?auth=login&redirect=${target}`)

    await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible()
    await expect(page).not.toHaveURL(/evil/)
  })
}

test("internal redirect target is kept", async ({ page }) => {
  await page.goto("/?auth=login&redirect=/cart")

  await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible()
  await expect(page).toHaveURL(/redirect=/)
})

test("browser back closes the dialog", async ({ page }) => {
  await page.goto("/")
  await page.goto("/?auth=login")
  await expect(page.getByRole("dialog")).toBeVisible()

  await page.goBack()

  await expect(page.getByRole("dialog")).toBeHidden()
})

test("reload keeps the dialog open", async ({ page }) => {
  await page.goto("/?auth=login")
  await expect(page.getByRole("dialog")).toBeVisible()

  await page.reload()

  await expect(page.getByRole("dialog")).toBeVisible()
})

test("escape closes the dialog and clears the params", async ({ page }) => {
  await page.goto("/?auth=login&redirect=/cart")
  await expect(page.getByRole("dialog")).toBeVisible()

  await page.keyboard.press("Escape")

  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(page).not.toHaveURL(/auth=|redirect=/)
})

test.describe("desktop shell", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "header is hidden")

  test("sign in opens the dialog over the current page", async ({ page }) => {
    await page.goto("/cart")
    await page.getByRole("link", { name: "Entrar" }).click()

    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/\/cart\?auth=login/)
    await expect(
      page.getByRole("heading", { name: "Carrinho", includeHidden: true })
    ).toBeAttached()
    await expect(dialog.locator(":focus")).toHaveCount(1)
  })

  test("closing the dialog returns focus to sign in", async ({ page }) => {
    await page.goto("/")
    const signIn = page.getByRole("link", { name: "Entrar" })
    await signIn.click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await page.keyboard.press("Escape")

    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(signIn).toBeFocused()
  })

  test("back leaves the page after closing the dialog", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /^Carrinho/ }).click()
    await expect(page).toHaveURL(/\/cart$/)
    await page.getByRole("link", { name: "Entrar" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page).toHaveURL(/\/cart$/)

    await page.goBack()

    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(page.getByRole("dialog")).toBeHidden()
  })

  test("the dialog stays over the not found page", async ({ page }) => {
    await page.goto("/nao-existe")
    await page.getByRole("link", { name: "Entrar" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page).toHaveURL(/\/nao-existe\?auth=login/)
  })

  test("the dialog keeps hash and scroll position", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 400 })
    await page.goto("/#catalog")
    await expect(page.getByRole("contentinfo")).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => {
      const target = document.createElement("div")
      target.id = "catalog"
      document.querySelector("main")?.prepend(target)
      window.scrollTo(0, 200)
    })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200)
    await page.getByRole("link", { name: "Entrar" }).dispatchEvent("click")
    await expect(page.getByRole("dialog")).toBeVisible()

    await expect(page).toHaveURL(/auth=login#catalog/)
    expect(await page.evaluate(() => window.scrollY)).toBe(200)

    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page).toHaveURL(/\/#catalog$/)
    expect(await page.evaluate(() => window.scrollY)).toBe(200)
  })

  test("out of scope nav item warns without navigating", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Criadores" }).click({ force: true })

    await expect(page.getByText("Em breve")).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test("only the current section is marked active", async ({ page }) => {
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav.locator("[aria-current=page]")).toHaveText("Início")

    await page.goto("/cart")
    await expect(nav.locator("[aria-current=page]")).toHaveText("Mercado")
  })
})

test.describe("mobile shell", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, "nav is hidden")

  test("scan warns without navigating", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Escanear" }).click({ force: true })

    await expect(page.getByText("Em breve")).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test("the toast does not cover the navigation", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Escanear" }).click({ force: true })
    await expect(page.getByText("Em breve")).toBeVisible()

    const toast = page.locator("[data-sonner-toast]")
    const scanBox = await page.getByRole("button", { name: "Escanear" }).boundingBox()

    await expect
      .poll(async () => {
        const box = await toast.boundingBox()
        return box!.y + box!.height
      })
      .toBeLessThanOrEqual(scanBox!.y)
  })

  test("taps beside the scan button reach the page", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("contentinfo")).toBeVisible()

    const insideNav = await page.evaluate(
      () =>
        document
          .elementFromPoint(40, window.innerHeight - 110)
          ?.closest("nav[aria-label='Navegação principal']") !== null
    )

    expect(insideNav).toBe(false)
  })
})

test("newsletter validates the e-mail and never claims a subscription", async ({
  page,
}) => {
  await page.goto("/")
  const email = page.getByLabel("E-mail")

  await email.fill("invalido")
  await page.getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByText("Digite um e-mail válido.")).toBeVisible()
  await expect(email).toHaveAttribute("aria-invalid", "true")

  await email.fill("colecionador@kurio.test")
  await page.getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByText("Em breve")).toBeVisible()
  await expect(page.getByText(/inscri/i)).toHaveCount(0)
})

test("footer contact band keeps two lines at 1440", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/")
  const band = page.getByRole("region", { name: "Contato" })
  await expect(band).toBeVisible()

  expect((await band.boundingBox())!.height).toBeLessThanOrEqual(88)
})

for (const width of [390, 768, 1024, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/")
    await expect(page.getByRole("contentinfo")).toBeVisible()

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
