import { test } from "@playwright/test";
import { loadConfig } from "./config";
import { BotSession } from "./session";
import { PHASE0_PERSONAS, AI_PERSONAS } from "./personas";
import { resolveAiKey } from "./ai/anthropic-client";

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
      for (const route of persona.routes ?? []) {
        await session.visit(route);
        await session.audit({ links: true });
      }
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

// AI-driven personas — only when AI is enabled (a budget is set AND a key is
// present). Each pursues a goal like a real user and judges the experience.
const aiEnabled = config.aiTokenBudget > 0 && resolveAiKey() !== null;

if (aiEnabled) {
  for (const persona of AI_PERSONAS) {
    test(`AI bot: ${persona.name}`, async ({ browser }) => {
      const session = await BotSession.create(browser, config, {
        persona: persona.name,
        storageStateFile: persona.storageStateFile,
      });
      try {
        await session.runAiGoal(
          persona.goal ??
            "Explore the site like a real user; report anything broken, confusing, or non-compliant.",
          persona.startPath ?? "/",
        );
        // Run the mechanical checks on wherever the bot ended up.
        await session.audit();
      } finally {
        await session.persist();
        await session.close();
      }
    });
  }
}
