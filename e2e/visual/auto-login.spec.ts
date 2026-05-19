import { test } from "@playwright/test";
import { AUTH_STATES } from "./state-registry";

const TEST_USERS = [
  {
    state: "user-individual",
    email: "test-individual@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "advisor",
    email: "test-advisor@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "broker",
    email: "test-broker@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "business",
    email: "test-business@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "advertiser",
    email: "test-advertiser@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "author",
    email: "test-author@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "admin",
    email: "test-admin@invest-test.local",
    password: "TestPassword123!@#",
  },
];

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

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

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login
      await page.goto(`${baseURL}${state.loginUrl}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      });

      // Fill email
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill(testUser.email);

      // Fill password
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(testUser.password);

      // Click login button (try multiple selectors)
      let loginButton = page.locator(
        'button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]'
      );
      if ((await loginButton.count()) === 0) {
        loginButton = page.locator("button").first();
      }
      await loginButton.click();

      // Wait for post-login redirect
      await page.waitForURL(state.postLoginPattern, { timeout: 15000 });
      console.log(`  ✓ Logged in, redirected to: ${page.url()}`);

      // Save authenticated session
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
