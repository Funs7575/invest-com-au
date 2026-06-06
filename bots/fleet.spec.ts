import fs from "node:fs";
import { test, devices } from "@playwright/test";
import { loadConfig } from "./config";
import { BotSession } from "./session";
import { PHASE0_PERSONAS, ADVISOR_PERSONAS, AI_PERSONAS, AUTHED_PERSONAS, LIFECYCLE_PERSONAS, STARTUP_ECOSYSTEM_PERSONAS, ADVISOR_PORTAL_PERSONAS, MOBILE_PERSONAS, AI_COPY_PERSONAS } from "./personas";
import { resolveAiKey } from "./ai/anthropic-client";
import { USER_LIFECYCLE_FLOW } from "./flows/user-lifecycle";
import { STARTUP_ECOSYSTEM_FLOW } from "./flows/startup-portal";
import { ADVISOR_PORTAL_FLOW } from "./flows/advisor-portal";
import { RATE_ALERT_FLOW } from "./flows/rate-alert";
import { checkCookieConsent } from "./checks/cookie-consent";

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

// Deterministic anonymous personas (no storage state needed). ADVISOR_PERSONAS
// adds adviser-directory coverage and runs the same way as PHASE0_PERSONAS — the
// intended default target is the protected Netlify mirror via `npm run bots:mirror`.
const DETERMINISTIC_PERSONAS = [...PHASE0_PERSONAS, ...ADVISOR_PERSONAS];

for (const persona of DETERMINISTIC_PERSONAS) {
  test(`bot persona: ${persona.name}`, async ({ browser }) => {
    const session = await BotSession.create(browser, config, {
      persona: persona.name,
      storageStateFile: persona.storageStateFile,
    });
    try {
      for (const route of persona.routes ?? []) {
        await session.visit(route);
        await session.audit({ links: true, visual: true });
        // Deep-crawl internal links on each page — catches 404s in nav/footer/related.
        await session.deepCrawl();
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

// Authenticated personas — drive logged-in surfaces using a seeded storageState.
// Each test SKIPS unless its storageState file exists on disk, so a normal/CI
// run without seeded auth never fails on them. They activate after
// `npm run bots:seed-users` + the e2e/visual auto-login capture. Money/affiliate/
// external paths stay auto-mocked by safety/money-paths.ts.
for (const persona of AUTHED_PERSONAS) {
  test(`authed bot: ${persona.name}`, async ({ browser }) => {
    const storageStateFile = persona.storageStateFile;
    test.skip(
      !storageStateFile || !fs.existsSync(storageStateFile),
      `no seeded storageState for "${persona.name}" — run bots:seed-users + auto-login first`,
    );

    const session = await BotSession.create(browser, config, {
      persona: persona.name,
      storageStateFile,
    });
    try {
      // Deterministic logged-in route sweep.
      for (const route of persona.routes ?? []) {
        await session.visit(route);
        await session.audit({ links: true });
      }
      // If AI is enabled, also let the persona pursue its logged-in goal.
      if (aiEnabled && persona.goal) {
        await session.runAiGoal(persona.goal, persona.startPath ?? "/account");
        await session.audit();
      }
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

// Lifecycle flow — scripted user journey (quiz → account → advisor → notifications).
// Skips unless the bot-buyer storageState exists on disk.
for (const persona of LIFECYCLE_PERSONAS) {
  test(`lifecycle: ${persona.name}`, async ({ browser }) => {
    const storageStateFile = persona.storageStateFile;
    test.skip(
      !storageStateFile || !fs.existsSync(storageStateFile),
      `no seeded storageState for "${persona.name}" — run bots:seed-users + auto-login first`,
    );

    const session = await BotSession.create(browser, config, {
      persona: persona.name,
      storageStateFile,
    });
    try {
      const results = await session.runFlow(USER_LIFECYCLE_FLOW);

      // Surface a roll-up finding so the report shows the overall pass/fail ratio.
      const failed = results.filter((r) => r.status === "fail");
      const skipped = results.filter((r) => r.status === "skip");
      session.store.add({
        severity: failed.length > 0 ? "high" : "info",
        category: "flow-failure",
        title: `lifecycle flow: ${results.length - failed.length - skipped.length}/${results.length} steps passed`,
        detail:
          results
            .map((r) => `${r.status === "pass" ? "✓" : r.status === "skip" ? "⊘" : "✗"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`)
            .join("\n"),
        url: session.page.url(),
        persona: persona.name,
        signatureKey: `lifecycle:rollup:${persona.name}`,
      });

      // Cross-cutting checks on wherever the flow ended up.
      await session.audit({ links: false });
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

// Startup ecosystem flow — public surfaces + portal auth gate.
// No storageState required: runs on any target including the Netlify mirror.
for (const persona of STARTUP_ECOSYSTEM_PERSONAS) {
  test(`startup-ecosystem: ${persona.name}`, async ({ browser }) => {
    const session = await BotSession.create(browser, config, {
      persona: persona.name,
    });
    try {
      const results = await session.runFlow(STARTUP_ECOSYSTEM_FLOW);

      const failed = results.filter((r) => r.status === "fail");
      const skipped = results.filter((r) => r.status === "skip");
      session.store.add({
        severity: failed.length > 0 ? "high" : "info",
        category: "flow-failure",
        title: `startup-ecosystem flow: ${results.length - failed.length - skipped.length}/${results.length} steps passed`,
        detail:
          results
            .map((r) => `${r.status === "pass" ? "✓" : r.status === "skip" ? "⊘" : "✗"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`)
            .join("\n"),
        url: session.page.url(),
        persona: persona.name,
        signatureKey: `startup-ecosystem:rollup:${persona.name}`,
      });

      await session.audit({ links: false });
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

// Advisor portal flow — login form render + health + public advisor surfaces.
// No storageState required. Works against any target.
for (const persona of ADVISOR_PORTAL_PERSONAS) {
  test(`advisor-portal: ${persona.name}`, async ({ browser }) => {
    const session = await BotSession.create(browser, config, {
      persona: persona.name,
    });
    try {
      const results = await session.runFlow(ADVISOR_PORTAL_FLOW);

      const failed = results.filter((r) => r.status === "fail");
      const skipped = results.filter((r) => r.status === "skip");
      session.store.add({
        severity: failed.length > 0 ? "high" : "info",
        category: "flow-failure",
        title: `advisor-portal flow: ${results.length - failed.length - skipped.length}/${results.length} steps passed`,
        detail:
          results
            .map((r) => `${r.status === "pass" ? "✓" : r.status === "skip" ? "⊘" : "✗"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`)
            .join("\n"),
        url: session.page.url(),
        persona: persona.name,
        signatureKey: `advisor-portal:rollup:${persona.name}`,
      });

      await session.audit({ links: false });
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

// ── Mobile viewport personas ───────────────────────────────────────────────
// Mirror PHASE0 routes on an iPhone 14 form factor. Catches mobile-specific
// failures: nav collapse, tap-target size, horizontal overflow. These run
// headlessly in Chrome's mobile emulation — no extra browsers needed.
for (const persona of MOBILE_PERSONAS) {
  test(`mobile bot: ${persona.name}`, async ({ browser }) => {
    const session = await BotSession.create(browser, config, {
      persona: persona.name,
      contextOptions: devices["iPhone 14"],
    });
    try {
      for (const route of persona.routes ?? []) {
        await session.visit(route);
        await session.audit({ links: false, forms: false });
      }
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

// ── Cookie consent fleet-level check ──────────────────────────────────────
// Runs once per fleet run: opens a fresh context (no cookies) and verifies a
// consent banner appears and analytics is not running before consent.
test("cookie consent: pre-consent analytics isolation", async ({ browser }) => {
  const { FindingStore } = await import("./findings/store");
  const { promises: fsAsync } = await import("node:fs");
  const nodePath = await import("node:path");
  const store = new FindingStore();
  await checkCookieConsent(browser, config.baseUrl, store);
  const shardsDir = nodePath.join(config.runDir, "shards");
  await fsAsync.mkdir(shardsDir, { recursive: true });
  const rand = Math.random().toString(36).slice(2, 8);
  await fsAsync.writeFile(
    nodePath.join(shardsDir, `cookie-consent-${rand}.json`),
    JSON.stringify({ persona: "cookie-consent-check", findings: store.all() }, null, 2),
    "utf8",
  );
});

// ── Rate-alert authenticated flow ─────────────────────────────────────────
// Skips unless the bot-buyer storageState exists. Tests alert creation and
// persistence in the account/alerts surface.
for (const persona of LIFECYCLE_PERSONAS) {
  test(`rate-alert: ${persona.name}`, async ({ browser }) => {
    const storageStateFile = persona.storageStateFile;
    test.skip(
      !storageStateFile || !fs.existsSync(storageStateFile),
      `no seeded storageState for "${persona.name}" — run bots:seed-users + auto-login first`,
    );
    const session = await BotSession.create(browser, config, {
      persona: `rate-alert-${persona.name}`,
      storageStateFile,
    });
    try {
      const results = await session.runFlow(RATE_ALERT_FLOW);
      const failed = results.filter((r) => r.status === "fail");
      const skipped = results.filter((r) => r.status === "skip");
      session.store.add({
        severity: failed.length > 0 ? "high" : "info",
        category: "flow-failure",
        title: `rate-alert flow: ${results.length - failed.length - skipped.length}/${results.length} steps passed`,
        detail: results.map((r) => `${r.status === "pass" ? "✓" : r.status === "skip" ? "⊘" : "✗"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`).join("\n"),
        url: session.page.url(),
        persona: `rate-alert-${persona.name}`,
        signatureKey: `rate-alert:rollup:${persona.name}`,
      });
      await session.audit({ links: false });
    } finally {
      await session.persist();
      await session.close();
    }
  });
}

if (aiEnabled) {
  // Advisor personas carry goals too, so let them explore/judge when AI is on.
  for (const persona of [...AI_PERSONAS, ...ADVISOR_PERSONAS]) {
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

  // AI copy-quality personas — focused scoring of top revenue pages.
  for (const persona of AI_COPY_PERSONAS) {
    test(`AI copy: ${persona.name}`, async ({ browser }) => {
      const session = await BotSession.create(browser, config, {
        persona: persona.name,
      });
      try {
        await session.runAiGoal(
          persona.goal ?? "Evaluate this page for copy quality, disclosure, and CTA clarity.",
          persona.startPath ?? "/",
        );
        await session.audit({ forms: false, links: false });
      } finally {
        await session.persist();
        await session.close();
      }
    });
  }
}
