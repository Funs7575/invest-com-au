import { test } from "@playwright/test";
import { loadConfig } from "./config";
import { BotSession } from "./session";
import { PHASE0_PERSONAS } from "./personas";

/**
 * Fleet entrypoint.
 *
 * Phase 0: one deterministic session per persona, each walking its route list
 * and running the cross-cutting checks (console / network / a11y / broken
 * links) under the safety net. Playwright distributes the sessions across
 * `workers` (BOTS_CONCURRENCY) so the fleet runs concurrently. Each session
 * persists a shard; globalTeardown aggregates them into one report.
 *
 * Later phases add: authenticated personas (storage states), deterministic
 * critical-path flows, and the AI-driven explore/judge driver.
 */

const config = loadConfig();

for (const persona of PHASE0_PERSONAS) {
  test(`bot persona: ${persona.name}`, async ({ browser }) => {
    const session = await BotSession.create(browser, config, {
      persona: persona.name,
      storageStateFile: persona.storageStateFile,
    });
    try {
      for (const route of persona.routes) {
        await session.visit(route);
        await session.audit({ links: true });
      }
    } finally {
      await session.persist();
      await session.close();
    }
  });
}
