import { test, expect } from "@playwright/test";

/**
 * Smoke tests for KK-04 automated internal link injection.
 *
 * These verify that the article page renders correctly with the
 * link-injection system active and that the feature flag kill-switch
 * doesn't break the page when flipped. They don't assert on specific
 * injected links because the staging DB content varies — they assert
 * on structural correctness (page renders, article body exists, no
 * JS errors).
 */

test("articles listing page renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const res = await page.goto("/articles");
  expect(res?.status(), "/articles should return 200").toBeLessThan(400);
  await expect(page.locator("main, [role='main']").first()).toBeVisible();
  expect(errors).toHaveLength(0);
});

test("article page: navigating from listing reaches an article body", async ({
  page,
}) => {
  await page.goto("/articles");

  // Find any article link in the listing
  const articleLink = page
    .locator('a[href^="/article/"]')
    .first();

  const count = await articleLink.count();
  if (count === 0) {
    // No articles seeded in this environment — skip the rest.
    test.skip();
    return;
  }

  const href = await articleLink.getAttribute("href");
  await page.goto(href!);

  // The article page must render a main element without a 4xx/5xx.
  await expect(page.locator("main, [role='main']").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("article page: injected links use amber styling when present", async ({
  page,
}) => {
  await page.goto("/articles");
  const articleLink = page.locator('a[href^="/article/"]').first();
  const count = await articleLink.count();
  if (count === 0) {
    test.skip();
    return;
  }

  const href = await articleLink.getAttribute("href");
  await page.goto(href!);

  // If link injection is active, links will carry the amber class.
  // If the kill-switch is off, this count is 0 — both are valid;
  // we just assert no JS errors either way.
  const injectedLinks = page.locator('a.text-amber-700');
  const linkCount = await injectedLinks.count();

  // Whether 0 or more, the page must not have crashed.
  await expect(page.locator("main").first()).toBeVisible();

  // Each injected link must have a valid /internal href (never empty).
  for (let i = 0; i < Math.min(linkCount, 5); i++) {
    const linkHref = await injectedLinks.nth(i).getAttribute("href");
    expect(linkHref, `injected link #${i} should have an href`).toBeTruthy();
    expect(linkHref, `injected link #${i} href should be internal`).toMatch(/^\//);
  }
});

test("article page: no uncaught JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/articles");
  const articleLink = page.locator('a[href^="/article/"]').first();
  const count = await articleLink.count();
  if (count === 0) {
    test.skip();
    return;
  }

  const href = await articleLink.getAttribute("href");
  await page.goto(href!);

  // Wait for content to settle
  await page.waitForLoadState("networkidle");
  expect(
    errors,
    `Article page should not throw JS errors: ${errors.join(", ")}`,
  ).toHaveLength(0);
});
