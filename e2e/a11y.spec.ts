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
 * Adding a route: append to ROUTES. Routes with heavy client-side
 * state (admin, account) need their own fixtures — keep them out of
 * this suite unless an auth helper is wired in.
 */

// Only routes that render cleanly with placeholder Supabase creds.
// DB-dependent routes (/compare, /find-advisor, /broker/*, /quiz) are
// deliberately omitted — they'd fail for lack of data, not a11y.
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

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) has no serious or critical a11y violations`, async ({
    page,
  }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    // Let client components settle; some rely on post-mount data to
    // render their labels.
    await page.waitForTimeout(400);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(DISABLED_RULES)
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (blocking.length > 0) {
      // Helpful console output so the CI annotation shows exactly
      // where the violation is.
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
