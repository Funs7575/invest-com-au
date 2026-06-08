/**
 * Advisor teams — public-facing flow.
 *
 * Tests the public team directory and team profile pages:
 *   1. /teams hub renders with team cards
 *   2. Individual team profile renders (name, description, members)
 *   3. Team profile has at least one member card
 *   4. Team inquiry / "Get a quote" CTA is present
 *   5. /teams/new page renders the team creation form (no auth needed to view)
 *   6. Team JSON-LD (ProfessionalService) present on profile
 */

import type { Flow } from "./types";

export const ADVISOR_TEAMS_PUBLIC_FLOW: Flow = {
  name: "advisor-teams-public",
  description:
    "Walks the public teams directory, opens a team profile, and checks member cards, CTA, team-creation form, and ProfessionalService schema.",
  steps: [
    // ── Step 1: /teams hub renders ────────────────────────────────────────────
    {
      name: "teams-hub-renders",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/teams";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `teams hub returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-teams:hub:${status}`,
            detail: "/teams is the public squad directory.",
          });
          throw new Error(`/teams returned HTTP ${status}`);
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 20) throw new Error("/teams rendered almost no content");
      },
    },

    // ── Step 2: team profile page renders ────────────────────────────────────
    {
      name: "team-profile-renders",
      async run({ page, store, persona, config }) {
        // Find a team profile link from the hub.
        const teamLinks = page.locator('main a[href*="/teams/"]').filter({
          hasNot: page.locator('[href="/teams/new"]'),
        });
        const count = await teamLinks.count().catch(() => 0);

        if (count === 0) {
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "teams hub: no team profile links found",
            detail: "No /teams/[slug] links on the hub. Teams may not be seeded on this target.",
            url: page.url(),
            persona,
            signatureKey: "advisor-teams:no-team-links",
          });
          return;
        }

        const href = await teamLinks.first().getAttribute("href") ?? "";
        const teamUrl = config.baseUrl.replace(/\/$/, "") + href;
        const res = await page.goto(teamUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `team profile ${href} returned HTTP ${status}`,
            url: teamUrl,
            persona,
            signatureKey: `advisor-teams:profile:${status}`,
            detail: `Team profile page at ${href} returned a ${status} error.`,
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 30) {
          store.add({
            severity: "medium",
            category: "ux",
            title: `team profile ${href}: rendered almost no content`,
            url: page.url(),
            persona,
            signatureKey: "advisor-teams:profile:empty",
            detail: "Team profile body is nearly empty.",
          });
        }
      },
    },

    // ── Step 3: member cards present on team profile ──────────────────────────
    {
      name: "team-member-cards",
      async run({ page, store, persona }) {
        const url = page.url();
        // Skip if still on hub.
        if (!url.match(/\/teams\/[^/]+/)) return;

        const memberLinks = page.locator('main a[href^="/advisor/"], [data-member-card]');
        const count = await memberLinks.count().catch(() => 0);

        if (count === 0) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "team profile: no member advisor cards found",
            detail:
              "The team profile shows no member cards with /advisor/ links. " +
              "Team profiles should show who the members are — this is a key trust signal.",
            url,
            persona,
            signatureKey: "advisor-teams:profile:no-members",
          });
        }
      },
    },

    // ── Step 4: inquiry / quote CTA present ──────────────────────────────────
    {
      name: "team-cta-present",
      async run({ page, store, persona }) {
        const url = page.url();
        if (!url.match(/\/teams\/[^/]+/)) return;

        const ctaSelector =
          'button:has-text("Enquire"), a:has-text("Enquire"), button:has-text("Get a quote"), a:has-text("Get a quote"), ' +
          'button:has-text("Contact"), a:has-text("Contact"), button:has-text("Request"), a:has-text("Request")';

        const hasCTA = (await page.locator(ctaSelector).count().catch(() => 0)) > 0;
        if (!hasCTA) {
          store.add({
            severity: "high",
            category: "ux",
            title: "team profile: no enquiry / quote CTA",
            detail:
              "No enquiry, quote, contact, or request CTA found on the team profile page. " +
              "Teams need a clear conversion action — without it users have no path to engage.",
            url,
            persona,
            signatureKey: "advisor-teams:profile:no-cta",
          });
        }
      },
    },

    // ── Step 5: /teams/new renders team creation form ─────────────────────────
    {
      name: "team-creation-form-renders",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/teams/new";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status === 404) {
          store.add({
            severity: "low",
            category: "http-error",
            title: "teams/new returned 404",
            url,
            persona,
            signatureKey: "advisor-teams:new:404",
            detail: "/teams/new doesn't exist — team creation may have moved to the advisor portal.",
          });
          return;
        } else if (status >= 500) {
          store.add({
            severity: "high",
            category: "http-error",
            title: `teams/new returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-teams:new:${status}`,
            detail: "Server error on the team creation page.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(300);

        // Should render a form (even if behind an auth redirect).
        const hasFormOrAuth =
          (await page.locator('form, input[name="name"], input[name="team_name"]').count().catch(() => 0)) > 0 ||
          /log in|sign in|create an account/i.test(await page.locator("main, body").first().innerText().catch(() => ""));

        if (!hasFormOrAuth) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "teams/new: no creation form or auth gate found",
            detail: "The /teams/new page rendered but showed neither a form nor an auth redirect. The page may be broken.",
            url,
            persona,
            signatureKey: "advisor-teams:new:no-form",
          });
        }
      },
    },

    // ── Step 6: ProfessionalService JSON-LD on team profile ──────────────────
    {
      name: "team-schema-present",
      async run({ page, store, persona, config }) {
        // Navigate back to hub and open first team.
        const hubUrl = config.baseUrl.replace(/\/$/, "") + "/teams";
        await page.goto(hubUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const teamLinks = page.locator('main a[href*="/teams/"]').filter({
          hasNot: page.locator('[href="/teams/new"]'),
        });
        const href = await teamLinks.first().getAttribute("href").catch(() => null);
        if (!href) return;

        const teamUrl = config.baseUrl.replace(/\/$/, "") + href;
        await page.goto(teamUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const scripts = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => [] as string[]);
        const hasSchema = scripts.some((s) =>
          /"@type"\s*:\s*"(ProfessionalService|Organization|LocalBusiness)"/i.test(s)
        );

        if (!hasSchema) {
          store.add({
            severity: "low",
            category: "schema",
            title: "team profile: no ProfessionalService/Organization JSON-LD",
            detail:
              "Team profile page has no ProfessionalService, Organization, or LocalBusiness schema. " +
              "Structured data helps AI search engines cite team profiles.",
            url: page.url(),
            persona,
            signatureKey: "advisor-teams:profile:no-schema",
          });
        }
      },
    },
  ],
};
