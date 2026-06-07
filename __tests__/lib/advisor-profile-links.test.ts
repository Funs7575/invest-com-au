import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for the dead-link class fixed alongside the marketplace
 * rebuild.
 *
 * Individual advisor / professional profiles live at `/advisor/<slug>`
 * (singular). `/advisors/<x>` is the *category* directory route
 * (`app/advisors/[type]`), so linking a person slug there renders
 * "Advisor Category Not Found" — a soft-404 (HTTP 200, `noindex`). These
 * files all linked person slugs to the plural route; they now use the
 * singular profile route. This test stops the footgun from creeping back.
 *
 * Files that legitimately link to *category* slugs are intentionally excluded
 * (e.g. the SMSF checker's `/advisors/smsf-specialists`, `app/sitemap.ts`,
 * the `/advisors/[type]` route itself, and the plural `/api/v1/advisors/...`
 * REST endpoints).
 */
const FILES_WITH_PROFILE_LINKS = [
  "app/marketplace/[intent]/[state]/page.tsx",
  "components/country-mode/CountryExpertsPreview.tsx",
  "components/SmartRecommendationsStrip.tsx",
  "app/find/[advisor-type]/[city]/page.tsx",
  "app/firm-portal/performance/FirmPerformanceClient.tsx",
  "app/office-hours/[id]/page.tsx",
  "app/api/cron/saved-search-alerts/route.ts",
  "app/api/cron/personalized-morning-brief/route.ts",
  "app/lists/[slug]/page.tsx",
  "app/account/verified/VerifiedClient.tsx",
];

describe("advisor profile links use the singular /advisor/<slug> route", () => {
  for (const rel of FILES_WITH_PROFILE_LINKS) {
    it(`${rel} does not link a person slug to the /advisors/ category route`, () => {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      // a person-slug interpolation into the plural route is the dead-link bug
      expect(src).not.toContain("/advisors/${");
    });
  }
});
