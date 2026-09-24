import { test, expect, type Page } from "@playwright/test";

/**
 * The beta onboarding, end to end.
 *
 * The signup request is always intercepted: these tests must never append a row
 * to the real spreadsheet. What the endpoint itself accepts and refuses is
 * covered by the unit tests in src/app/api/beta-signup/route.test.ts.
 */

test.use({ locale: "it-IT" });

type Captured = { body: Record<string, unknown> | null };

async function stubSignup(page: Page, ok = true): Promise<Captured> {
  const captured: Captured = { body: null };

  await page.route("**/api/beta-signup", async (route) => {
    captured.body = route.request().postDataJSON();
    await route.fulfill({
      status: ok ? 200 : 502,
      contentType: "application/json",
      body: JSON.stringify(ok ? { ok: true } : { error: "storage_unavailable" }),
    });
  });

  return captured;
}

test("walks through the five screens and submits the signup", async ({ page }) => {
  const captured = await stubSignup(page);

  await page.goto("/it/beta");

  await expect(
    page.getByRole("heading", { name: "Notizie di qualità, da fonti scelte una per una" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Entra nella beta", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Come funziona" })).toBeVisible();
  await page.getByRole("button", { name: "Vai avanti", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Cosa non c'è ancora nella beta" })).toBeVisible();
  await page.getByRole("button", { name: "Vai avanti", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Un'ultima cosa" })).toBeVisible();
  await page.fill("#beta-email", "Persona@Example.com");
  await page.check("#beta-consent-updates");
  await page.getByRole("button", { name: "Conferma email", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Ci sei" })).toBeVisible();

  // What the browser actually sent
  expect(captured.body).toMatchObject({
    email: "Persona@Example.com",
    contactConsent: false,
    updatesConsent: true,
    locale: "it",
    company: "",
  });
  expect(captured.body?.elapsedMs).toBeGreaterThan(0);
});

test("neither consent is ticked by default", async ({ page }) => {
  await page.goto("/it/beta");
  await page.getByRole("button", { name: "Vai al passo 4", exact: true }).click();

  await expect(page.locator("#beta-consent-contact")).not.toBeChecked();
  await expect(page.locator("#beta-consent-updates")).not.toBeChecked();
});

test("refuses a malformed address without calling the endpoint", async ({ page }) => {
  let called = false;
  await page.route("**/api/beta-signup", async (route) => {
    called = true;
    await route.fulfill({ status: 200, body: "{}" });
  });

  await page.goto("/it/beta");
  await page.getByRole("button", { name: "Vai al passo 4", exact: true }).click();
  await page.fill("#beta-email", "non-una-email");
  await page.getByRole("button", { name: "Conferma email", exact: true }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Un'ultima cosa" })).toBeVisible();
  expect(called).toBe(false);
});

test("keeps the visitor on the form when storing fails", async ({ page }) => {
  await stubSignup(page, false);

  await page.goto("/it/beta");
  await page.getByRole("button", { name: "Vai al passo 4", exact: true }).click();
  await page.fill("#beta-email", "persona@example.com");
  await page.getByRole("button", { name: "Conferma email", exact: true }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ci sei" })).toBeHidden();
});

test("the last screen leaves for the app subdomain", async ({ page }) => {
  await stubSignup(page);

  await page.goto("/it/beta");
  await page.getByRole("button", { name: "Vai al passo 4", exact: true }).click();
  await page.fill("#beta-email", "persona@example.com");
  await page.getByRole("button", { name: "Conferma email", exact: true }).click();

  await expect(page.getByRole("link", { name: "Apri il feed", exact: true })).toHaveAttribute(
    "href",
    "https://app.agerculture.com/it"
  );
});

test("the privacy notice is reachable from the form and names the controller", async ({ page }) => {
  await page.goto("/it/beta");
  await page.getByRole("button", { name: "Vai al passo 4", exact: true }).click();

  const link = page.getByRole("link", { name: "Come trattiamo la tua email" });
  await expect(link).toBeVisible();

  await page.goto("/it/beta/privacy");
  await expect(page.getByRole("heading", { name: /Informativa privacy/ })).toBeVisible();
  await expect(page.getByText("Simone Gandini")).toBeVisible();
});

test("the onboarding is noindex", async ({ page }) => {
  const response = await page.goto("/it/beta");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("nothing overflows sideways on a small phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/it/beta");

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(overflows).toBe(false);
});
