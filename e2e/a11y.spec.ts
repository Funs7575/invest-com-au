import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility regression suite.
 *
 * Runs axe-core against a curated list of high-value routes and
 * fails the job on any WCAG 2 AA serious/critical violation. Minor
 * and moderate issues are logged but don't block — the goal is to
 * prevent real blockers (missing form labels, broken focus, invalid
 * aria) from landing.
 *
 * Adding a route: append to ROUTES (critical-only gate) or
 * HIGH_TRAFFIC_ROUTES (serious+critical gate). Routes with heavy
 * client-side state (admin, account) need their own fixtures — keep
 * them out of this suite unless an auth helper is wired in.
 *
 * Gate levels:
 *   ROUTES             — legacy set; hard-fails on critical only.
 *                        Serious violations are soft-logged.
 *                        (Amber-500/600 links + glossary badges that
 *                        drove the "serious" soft-log were fixed in
 *                        the 2026-05-25 a11y sweep; this set could be
 *                        raised to the HIGH_TRAFFIC_ROUTES gate in a
 *                        follow-up once CI passes cleanly.)
 *   HIGH_TRAFFIC_ROUTES — hard-fails on serious AND critical.
 *                        Applied to the highest-traffic interactive
 *                        surfaces added in the same sweep.
 */

// Only routes that render cleanly with placeholder Supabase creds.
const ROUTES = [
  { path: "/", name: "Homepage" },
  { path: "/glossary", name: "Glossary" },
  { path: "/tools", name: "Tools index" },
  { path: "/foreign-investment", name: "Foreign investment hub" },
  { path: "/about", name: "About" },
  { path: "/how-we-earn", name: "How we earn" },
  { path: "/privacy", name: "Privacy policy" },
  { path: "/terms", name: "Terms" },
];

/**
 * High-traffic interactive routes added in the 2026-05-25 a11y sweep.
 *
 * Gate: hard-fail on serious AND critical violations.
 *
 * Seeding notes per route:
 *   /compare     — degrades to an empty broker list with placeholder
 *                  Supabase creds; the directory shell + filter chrome
 *                  still renders for axe to scan.
 *   /advisors    — throws when the DB is unreachable; the Next.js error
 *                  boundary (app/advisors/error.tsx) renders a friendly
 *                  page that is itself a valid a11y target.
 *   /calculators — broker fetch is wrapped in try/catch; degrades to an
 *                  empty broker list and renders the full calculator hub.
 *   /search?q=broker
 *                — DB brokers/advisors/articles return [] on error;
 *                  glossary + tools results are static and always show.
 *   /find-advisor — pure client-side wizard (no SSR DB calls); renders
 *                  step 1 unconditionally.
 *
 * Deliberately NOT gated here: /broker/[slug]. A broker *profile* is
 * entirely DB-driven and reads cookies (createClient), so with no
 * database — CI builds *and* runs with placeholder Supabase creds — it
 * cannot render: the ISR/prerender path bails (DYNAMIC_SERVER_USAGE) to
 * a bare framework 500 with no <html lang>/<title>. Scanning that error
 * surface tests nothing about the real profile, and forcing it to render
 * an error/404 page would only swap one un-representative surface for
 * another while costing the page its ISR caching. Broker-profile a11y
 * belongs against real data (the Vercel preview deploy), not the
 * placeholder-creds artifact, so the route is left out of this no-DB gate.
 */
const HIGH_TRAFFIC_ROUTES = [
  { path: "/compare", name: "Compare platforms" },
  { path: "/advisors", name: "Advisor directory" },
  { path: "/calculators", name: "Calculators hub" },
  { path: "/search?q=broker", name: "Search results" },
  { path: "/find-advisor", name: "Find-advisor wizard" },
];

/**
 * Rules we deliberately disable because they fire on dynamic
 * broker/advisor data that's out of our direct control (e.g. stock
 * tickers with no alt text in charts), OR on patterns Next.js
 * inserts during hydration that don't affect real users.
 */
const DISABLED_RULES = [
  // Next.js inserts invisible divs for route transitions; axe flags
  // them as empty landmarks even though users can't reach them.
  "region",
];

// WCAG 2 AA 1.4.3 exempts "text that is part of a logo or brand name"
// from the contrast minimum. The brand wordmark renders ".com.au" in
// amber-500 (the brand colour) inside the header brand link; we exclude
// that span so the on-brand logo doesn't trip color-contrast, without
// suppressing the rule anywhere else on the page.
const LOGO_EXEMPT_SELECTOR = 'a[aria-label^="Invest.com.au"] span';

// ── Legacy routes: hard-fail on critical only ────────────────────────────────

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) has no critical a11y violations`, async ({
    page,
  }) => {
    // `networkidle` on the homepage never settles in CI — analytics
    // + tracking fetches keep the network busy past the 15s goto
    // default, so chromium hits TimeoutError on retry. Wait for DOM
    // only; 600ms post-mount gives client components enough time to
    // render their labels without depending on network quiescence.
    await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load", { timeout: 30_000 });
    await page.waitForTimeout(600);

    const results = await new AxeBuilder({ page })
      .exclude(LOGO_EXEMPT_SELECTOR)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(DISABLED_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (serious.length > 0) {
      console.log(
        `\n[serious] ${serious.length} violation(s) on ${path} (logged but not blocking):`,
      );
      for (const v of serious) {
        console.log(`  - ${v.id}: ${v.help}`);
      }
    }

    const blocking = critical;

    if (blocking.length > 0) {
      for (const v of blocking) {
        console.log(
          `\n[${v.impact}] ${v.id}: ${v.help}\n  ${v.helpUrl}\n  Nodes (${v.nodes.length}):`,
        );
        for (const n of v.nodes.slice(0, 5)) {
          console.log(`    - ${n.target.join(" ")}`);
        }
      }
    }

    expect(
      blocking,
      `${blocking.length} critical a11y violation(s) on ${path}. See job log above.`,
    ).toEqual([]);
  });
}

// ── High-traffic routes: hard-fail on serious AND critical ───────────────────

for (const { path, name } of HIGH_TRAFFIC_ROUTES) {
  test(`${name} (${path}) has no serious or critical a11y violations`, async ({
    page,
  }) => {
    await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load", { timeout: 30_000 });
    // Extra wait for client components (wizard step, filter chrome) to hydrate.
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .exclude(LOGO_EXEMPT_SELECTOR)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(DISABLED_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");
    const blocking = [...critical, ...serious];

    if (blocking.length > 0) {
      for (const v of blocking) {
        console.log(
          `\n[${v.impact}] ${v.id}: ${v.help}\n  ${v.helpUrl}\n  Nodes (${v.nodes.length}):`,
        );
        for (const n of v.nodes.slice(0, 5)) {
          console.log(`    - ${n.target.join(" ")}`);
        }
      }
    }

    expect(
      blocking,
      `${blocking.length} serious/critical a11y violation(s) on ${path}. See job log above.`,
    ).toEqual([]);
  });
}
