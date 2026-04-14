/**
 * AFSL compliance coverage enforcement.
 *
 * Every page that shows financial products, prices, returns, broker
 * comparisons, or fee data MUST render <ComplianceFooter /> somewhere
 * in the file. Failing to do so is a Corporations Act s912D breach
 * because a retail reader sees product recommendations with no
 * "general advice" warning or advertiser disclosure.
 *
 * This test checks the product-facing page directories and fails if
 * a new page lands without the component. If you legitimately need
 * to skip (e.g. a page that explicitly renders the disclaimer a
 * different way), add it to ALLOWLIST below with a comment.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

// Page roots that MUST have compliance on every leaf page.
const MANDATORY_ROOTS = [
  "app/compare",
  "app/best",
  "app/brokers",
  "app/calculators",
  "app/broker",
  "app/advisor",
  "app/investment",
  "app/property",
  "app/etfs",
  "app/crypto",
  "app/forex",
  "app/super",
];

// Files that do not need compliance (non-product pages, utility routes, etc.)
const ALLOWLIST = new Set<string>([
  // Index/landing pages that don't show product data themselves
  "app/compare/page.tsx",
  "app/best/page.tsx",
  "app/brokers/page.tsx",
  "app/property/page.tsx",
  // Compliance is rendered in a nested layout for these trees
  "app/calculators/layout.tsx",
  // Pure redirects — no product content ever rendered
  "app/broker/page.tsx",
]);

const COMPLIANCE_PATTERNS = [
  /ComplianceFooter/,
  /PropertyDisclaimer/, // property-specific variant
  /GENERAL_ADVICE_WARNING/, // raw use of the constant
];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (name === "page.tsx") out.push(path);
  }
  return out;
}

/**
 * Check whether the file itself or any of its sibling/parent
 * layout.tsx files render compliance. This handles pages that
 * inherit the footer from a layout.
 */
function hasCompliance(filePath: string): boolean {
  // Self
  const src = readFileSync(filePath, "utf8");
  if (COMPLIANCE_PATTERNS.some((p) => p.test(src))) return true;

  // Check any layout.tsx in the same dir or any ancestor within app/
  const parts = filePath.split("/");
  const appIdx = parts.indexOf("app");
  if (appIdx === -1) return false;
  for (let i = parts.length - 1; i > appIdx; i--) {
    const layoutPath = [...parts.slice(0, i), "layout.tsx"].join("/");
    if (existsSync(layoutPath)) {
      const lsrc = readFileSync(layoutPath, "utf8");
      if (COMPLIANCE_PATTERNS.some((p) => p.test(lsrc))) return true;
    }
  }
  return false;
}

describe("AFSL compliance coverage", () => {
  for (const root of MANDATORY_ROOTS) {
    const files = walk(join(process.cwd(), root));
    if (files.length === 0) continue;

    for (const file of files) {
      const rel = file.replace(process.cwd() + "/", "");
      if (ALLOWLIST.has(rel)) continue;
      it(`${rel} renders a compliance disclosure`, () => {
        expect(
          hasCompliance(file),
          `No ComplianceFooter / PropertyDisclaimer / GENERAL_ADVICE_WARNING found in ${rel} or any ancestor layout. Add <ComplianceFooter /> or allowlist with justification.`,
        ).toBe(true);
      });
    }
  }
});
