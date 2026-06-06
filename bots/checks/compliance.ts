/**
 * Financial compliance copy checker.
 *
 * Verifies that every page with financial content carries the required
 * disclosure language mandated by Corporations Act 2001 s766B(6)/(7) and
 * ASIC's general advice rules. Invest.com.au does not hold an AFSL and must
 * clearly disclose that it provides general information only, not personal
 * financial advice.
 *
 * Three marker groups are checked (case-insensitive body-text search):
 *   Group 1 — "general information"  (required on all financial pages)
 *   Group 2 — "not personal" | "not financial advice" | "general advice"
 *             (broad general-advice signal)
 *   Group 3 — "licensed financial adviser" | "AFSL"
 *             (regulatory context — lets users know independent advice exists)
 *
 * Findings:
 *   • None of the three groups present → high (no disclosure at all)
 *   • Group 1 only, groups 2+3 absent → medium (AFSL/adviser context missing)
 *
 * Called from BotSession.audit() for every visited page; the route guard
 * ensures only financially-relevant URLs are evaluated.
 */

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";

/** Routes where compliance copy is required (prefix or exact match). */
const COMPLIANCE_ROUTES = new Set([
  "/",
  "/compare",
  "/broker/",
  "/advisors",
  "/find-advisor",
  "/share-trading",
  "/etfs",
  "/super",
  "/crypto",
  "/savings",
  "/best",
  "/best-broker/",
  "/foreign-investment",
  "/glossary",
]);

function isComplianceRoute(route: string): boolean {
  // Exact matches first
  if (COMPLIANCE_ROUTES.has(route)) return true;
  // Prefix matches (e.g. "/broker/ig-markets" → prefix "/broker/")
  for (const prefix of COMPLIANCE_ROUTES) {
    if (prefix.endsWith("/") && route.startsWith(prefix)) return true;
    if (!prefix.endsWith("/") && route.startsWith(prefix + "/")) return true;
  }
  return false;
}

interface ComplianceMarkers {
  hasGeneralInformation: boolean;
  hasGeneralAdviceSignal: boolean;
  hasAFSLContext: boolean;
}

async function extractComplianceMarkers(page: Page): Promise<ComplianceMarkers> {
  return page.evaluate((): ComplianceMarkers => {
    const body = (document.body?.textContent ?? "").toLowerCase();

    const hasGeneralInformation = body.includes("general information");

    const hasGeneralAdviceSignal =
      body.includes("not personal") ||
      body.includes("not financial advice") ||
      body.includes("general advice");

    const hasAFSLContext =
      body.includes("licensed financial adviser") ||
      body.includes("afsl");

    return { hasGeneralInformation, hasGeneralAdviceSignal, hasAFSLContext };
  });
}

export async function checkCompliance(
  page: Page,
  store: FindingStore,
  persona: string,
): Promise<void> {
  const pageUrl = page.url();
  let route = pageUrl;
  try {
    route = new URL(pageUrl).pathname;
  } catch {
    return;
  }

  if (!isComplianceRoute(route)) return;

  let markers: ComplianceMarkers;
  try {
    markers = await extractComplianceMarkers(page);
  } catch {
    return; // page may have navigated away
  }

  const hasAnyContext = markers.hasGeneralAdviceSignal || markers.hasAFSLContext;

  // ── 1. No disclosure copy at all ──────────────────────────────────────────
  if (!markers.hasGeneralInformation && !hasAnyContext) {
    store.add({
      severity: "high",
      category: "compliance",
      title: `compliance: no disclosure copy found on ${route}`,
      detail:
        `${route} is a financial content page but none of the required disclosure markers ` +
        `were found in the page body. Invest.com.au does not hold an AFSL and must display ` +
        `a general information disclaimer on all pages with financial content. ` +
        `Add the GENERAL_ADVICE_WARNING from lib/compliance.ts to the page footer or ` +
        `an inline disclaimer section.`,
      url: pageUrl,
      persona,
      signatureKey: `compliance:no-disclosure:${route}`,
    });
    return;
  }

  // ── 2. General information present but no AFSL/adviser context ────────────
  if (markers.hasGeneralInformation && !hasAnyContext) {
    store.add({
      severity: "medium",
      category: "compliance",
      title: `compliance: missing AFSL/adviser context on ${route}`,
      detail:
        `${route} contains "general information" copy but is missing the AFSL/adviser ` +
        `context required to satisfy ASIC's general advice rules. The page should reference ` +
        `either the site's non-AFSL status or recommend users seek advice from a licensed ` +
        `financial adviser. Add the AFSL_STATUS_DISCLOSURE or GENERAL_ADVICE_WARNING ` +
        `(which includes the licensed financial adviser reference) from lib/compliance.ts.`,
      url: pageUrl,
      persona,
      signatureKey: `compliance:no-afsl:${route}`,
    });
  }
}
