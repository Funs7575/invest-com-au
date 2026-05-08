import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import { INTENT_COUNTRY_CODES, intentCountryMeta } from "@/lib/intent-context";

const FOREIGN_INVESTMENT_DIR = path.resolve(
  process.cwd(),
  "app/foreign-investment",
);

const EXPECTED_SLUGS = INTENT_COUNTRY_CODES.map(
  (code) => intentCountryMeta(code).slug,
);

describe("foreign-investment country routes (config-only renderer)", () => {
  it.each(EXPECTED_SLUGS)(
    "has standalone /foreign-investment/%s/page.tsx",
    (slug) => {
      const file = path.join(FOREIGN_INVESTMENT_DIR, slug, "page.tsx");
      expect(fs.existsSync(file)).toBe(true);
    },
  );

  it("does not have the legacy dynamic [country] route (Phase 4)", () => {
    expect(
      fs.existsSync(path.join(FOREIGN_INVESTMENT_DIR, "[country]")),
    ).toBe(false);
  });

  it("does not silently create unmapped country pages", () => {
    expect(
      fs.existsSync(path.join(FOREIGN_INVESTMENT_DIR, "germany", "page.tsx")),
    ).toBe(false);
  });

  it("covers every IntentCountryCode (no orphaned codes)", () => {
    const missing = INTENT_COUNTRY_CODES.filter((code) => {
      const slug = intentCountryMeta(code).slug;
      return !fs.existsSync(
        path.join(FOREIGN_INVESTMENT_DIR, slug, "page.tsx"),
      );
    });
    expect(missing).toEqual([]);
  });
});
