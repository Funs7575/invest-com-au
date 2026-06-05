import { test } from "@playwright/test";
import { AUTH_STATES, TEST_USER_PASSWORD } from "./state-registry";

// Email per state; the password is shared (see TEST_USER_PASSWORD) so it stays
// in lockstep with scripts/seed-bot-users.ts and the rest of the seed flow.
const TEST_USERS = [
  { state: "user-individual", email: "test-individual@invest-test.local" },
  { state: "advisor", email: "test-advisor@invest-test.local" },
  { state: "broker", email: "test-broker@invest-test.local" },
  { state: "business", email: "test-business@invest-test.local" },
  { state: "advertiser", email: "test-advertiser@invest-test.local" },
  { state: "author", email: "test-author@invest-test.local" },
  { state: "admin", email: "test-admin@invest-test.local" },
  { state: "listing-owner", email: "test-listing-owner@invest-test.local" },
  { state: "firm-portal", email: "test-firm-admin@invest-test.local" },
  // Dedicated bot-fleet individual account — seeded by scripts/seed-bot-users.ts.
  { state: "bot-buyer", email: "test-bot-buyer@invest-test.local" },
].map((u) => ({ ...u, password: TEST_USER_PASSWORD }));

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Remote/sandbox egress proxies can MITM TLS with a CA chromium doesn't trust.
// Manually-created contexts (browser.newContext()) don't inherit the config's
// `use.ignoreHTTPSErrors`, so opt in explicitly via the same env the bots use.
const ignoreHTTPSErrors =
  process.env.E2E_IGNORE_HTTPS_ERRORS === "1" ||
  process.env.BOTS_IGNORE_HTTPS_ERRORS === "1";

test("auto-login: create authenticated sessions for all test users", async ({
  browser,
}) => {
  for (const testUser of TEST_USERS) {
    const state = AUTH_STATES.find((s) => s.name === testUser.state);
    if (!state) {
      console.log(`⚠️  Skipping unknown state: ${testUser.state}`);
      continue;
    }

    console.log(`\n🔑 Logging in: ${testUser.state} (${testUser.email})`);

    const context = await browser.newContext({ ignoreHTTPSErrors });
    const page = await context.newPage();

    try {
      // `networkidle` never settles on auth pages (the Supabase client holds a
      // connection open), so wait for the DOM instead.
      await page.goto(`${baseURL}${state.loginUrl}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for the form to hydrate before touching it — otherwise the tab
      // probe below races client hydration and the password field never mounts.
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.waitFor({ state: "visible", timeout: 15000 });

      // The public /login form defaults to a magic-link tab; the password
      // fields only mount once the "Password" tab is selected. Best-effort —
      // portal login forms don't have this tab.
      const passwordTab = page.getByRole("button", { name: "Password", exact: true });
      if (await passwordTab.count()) {
        await passwordTab.first().click().catch(() => {});
      }

      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: "visible", timeout: 10000 });
      await emailInput.fill(testUser.email);
      await passwordInput.fill(testUser.password);

      let loginButton = page.locator(
        'button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]'
      );
      if ((await loginButton.count()) === 0) {
        loginButton = page.locator("button").first();
      }
      await loginButton.click();

      // Success = matches the state's post-login pattern AND is no longer a
      // login page. Without the second clause, patterns like /broker-portal(\/|$)/
      // match /broker-portal/login and produce a junk "authenticated" session.
      await page.waitForURL(
        (url) =>
          state.postLoginPattern.test(url.pathname) &&
          !/\/login(\/|$)/i.test(url.pathname),
        { timeout: 15000 }
      );
      console.log(`  ✓ Logged in, redirected to: ${page.url()}`);

      const stateFile = state.storageStateFile;
      await page.context().storageState({ path: stateFile });
      console.log(`  ✓ Session saved to: ${stateFile}`);
    } catch (err) {
      console.error(`  ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await context.close();
    }
  }

  console.log("\n✅ All sessions ready. Run: npm run screenshots\n");
});
