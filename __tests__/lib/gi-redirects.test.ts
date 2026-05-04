import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// GI-stream redirect map verification.
//
// Reads next.config.ts and asserts that each GI-03 redirect (from →
// to + permanent) is present. This catches the failure mode where a
// future edit accidentally removes a GI redirect — those URLs are
// the consolidation point for ranking signal previously fragmented
// across /best/us-shares*, /best/cheapest-us-shares, etc.
//
// Reference: docs/audits/GLOBAL_INVESTING_PROGRAM.md §3.

interface GiRedirect {
  from: string;
  to: string;
}

const GI_REDIRECTS_SHIPPED: GiRedirect[] = [
  { from: "/best/us-shares", to: "/global-investing/shares/us" },
  { from: "/best/cheapest-us-shares", to: "/global-investing/shares/us" },
  { from: "/best/us-shares-5000", to: "/global-investing/shares/us" },
  { from: "/best/us-shares-monthly", to: "/global-investing/shares/us" },
  { from: "/best/us-fee", to: "/global-investing/shares/us" },
  { from: "/best/invest-in-us-shares", to: "/global-investing/shares/us" },
  { from: "/etfs/us-exposure", to: "/global-investing/etfs/us" },
  { from: "/etfs/international", to: "/global-investing/etfs/global" },
];

// Deferred redirects — destinations don't exist yet. Documented for the
// next loop iteration so they can be flipped without re-deriving the map.
const GI_REDIRECTS_DEFERRED: { from: string; to: string; blockedBy: string }[] = [
  { from: "/best/international-shares", to: "/global-investing/shares", blockedBy: "GI-10" },
  { from: "/best/best-international-etfs", to: "/global-investing/etfs/global", blockedBy: "now-shippable (target landed)" },
  { from: "/best/forex", to: "/global-investing/currency/best-fx-providers", blockedBy: "GI-51" },
  { from: "/best/start-forex-trading", to: "/global-investing/currency/best-fx-providers", blockedBy: "GI-51" },
  { from: "/best/low-fx-fees", to: "/global-investing/currency/best-fx-providers", blockedBy: "GI-51" },
];

describe("GI-stream — /global-investing redirect map (next.config.ts)", () => {
  const configSource = readFileSync(join(__dirname, "../../next.config.ts"), "utf-8");

  describe.each(GI_REDIRECTS_SHIPPED)("$from → $to", ({ from, to }) => {
    it("is present in next.config.ts redirects()", () => {
      // We verify the source/destination pair appears together, not just
      // that each string exists somewhere in the file. The redirect entry
      // shape ensures from + to + permanent:true land within ~10 lines of
      // each other.
      const fromIdx = configSource.indexOf(`source: "${from}"`);
      expect(fromIdx, `"${from}" not found as a redirect source`).toBeGreaterThan(-1);

      const slice = configSource.slice(fromIdx, fromIdx + 200);
      expect(slice, `"${from}" → "${to}" pair not found`).toContain(`destination: "${to}"`);
      expect(slice, `"${from}" must be permanent: true (301)`).toContain("permanent: true");
    });
  });

  it("documents 5 deferred redirects waiting on target pages", () => {
    expect(GI_REDIRECTS_DEFERRED).toHaveLength(5);
    // Sanity-check that none of the deferred from-paths are accidentally
    // already shipped (would be a copy-paste error).
    for (const deferred of GI_REDIRECTS_DEFERRED) {
      expect(
        configSource.includes(`source: "${deferred.from}"`),
        `${deferred.from} is in the deferred list but appears in next.config.ts — either remove from deferred list or remove from config`,
      ).toBe(false);
    }
  });

  it("each redirect destination starts with /global-investing/", () => {
    for (const redirect of [...GI_REDIRECTS_SHIPPED, ...GI_REDIRECTS_DEFERRED]) {
      expect(
        redirect.to.startsWith("/global-investing/"),
        `${redirect.from} → ${redirect.to} should land inside /global-investing/`,
      ).toBe(true);
    }
  });
});
