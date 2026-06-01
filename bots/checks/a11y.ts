/**
 * Accessibility check. Runs axe-core (same tags/disabled-rules as the existing
 * e2e/a11y.spec.ts) and records serious/critical WCAG violations as findings.
 * Mirrors the project's a11y gate so bots surface the same class of blocker
 * across the full surface, not just the curated route list.
 */

import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { FindingStore } from "../findings/store";

// `region` fires on Next.js route-transition placeholders users can't reach.
const DISABLED_RULES = ["region"];

export async function runAxe(page: Page, store: FindingStore, persona: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(DISABLED_RULES)
    .analyze()
    .catch(() => null);
  if (!results) return; // axe injection can fail on blank/error shells — non-fatal.

  for (const v of results.violations) {
    if (v.impact !== "critical" && v.impact !== "serious") continue;
    const nodes = v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(" "))
      .join("; ");
    store.add({
      severity: v.impact === "critical" ? "high" : "medium",
      category: "a11y",
      title: `${v.id}: ${v.help}`,
      detail: `${v.helpUrl}\nNodes: ${nodes}`,
      url: page.url(),
      persona,
      signatureKey: v.id,
      evidence: { rule: v.id, impact: v.impact, nodeCount: v.nodes.length },
    });
  }
}
