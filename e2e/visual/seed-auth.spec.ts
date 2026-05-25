import path from "node:path";
import { promises as fs } from "node:fs";
import { test } from "@playwright/test";
import { findState } from "./state-registry";

/**
 * Interactive auth-state seeder.
 *
 * Invoked via `npm run screenshots:seed -- <state>`. Opens a headed browser,
 * navigates to the login URL for the requested state, and waits for you to
 * complete login (including MFA). Once your browser reaches a URL that
 * matches the state's post-login pattern, the storage state is saved and
 * subsequent screenshot runs reuse it.
 *
 * Run: SEED_STATE=user-individual npx playwright test e2e/visual/seed-auth.spec.ts \
 *        --config e2e/visual/playwright.config.ts --headed
 */
test("seed auth state", async ({ browser }) => {
  test.setTimeout(0);

  const stateName = process.env.SEED_STATE;
  if (!stateName) {
    throw new Error("SEED_STATE env var is required (e.g. SEED_STATE=user-individual)");
  }
  const state = findState(stateName);
  if (!state) {
    throw new Error(`Unknown state: ${stateName}`);
  }

  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  console.log(`\n→ Opening ${baseUrl}${state.loginUrl}`);
  console.log(`  Log in as your ${state.name} test account.`);
  console.log(`  Waiting for URL to match ${state.postLoginPattern}...\n`);

  await page.goto(baseUrl + state.loginUrl);
  await page.waitForURL(state.postLoginPattern, { timeout: 5 * 60 * 1000 });

  await fs.mkdir(path.dirname(state.storageStateFile), { recursive: true });
  await ctx.storageState({ path: state.storageStateFile });
  console.log(`\n✓ Saved storage state for "${state.name}" → ${state.storageStateFile}`);
  console.log(`  Next runs of npm run screenshots will use this session.\n`);

  await ctx.close();
});
