/**
 * Schema.org JSON-LD drift checker.
 *
 * Reads every <script type="application/ld+json"> tag on the current page,
 * parses the structured data, and validates that required fields are present
 * per schema type. Missing or malformed schema is surfaced as a "schema"
 * category finding so the GEO/AI-citation posture is continuously validated.
 *
 * Called from BotSession.audit() so every visited page gets a check.
 * Pure module — no Playwright import in the validation logic.
 */

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";

/** Required fields per @type value. Only first-level keys checked. */
const REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ["headline", "datePublished", "author"],
  NewsArticle: ["headline", "datePublished", "author"],
  BlogPosting: ["headline", "datePublished", "author"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  Product: ["name", "offers"],
  Organization: ["name", "url"],
  WebSite: ["name"],
  WebPage: ["name"],
  Person: ["name"],
  Event: ["name", "startDate"],
  HowTo: ["name", "step"],
  ItemList: ["itemListElement"],
  FinancialProduct: ["name", "feesAndCommissionsSpecification"],
};

/** Flatten @graph arrays so each node is validated individually. */
function flatten(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj["@graph"])) {
    return (obj["@graph"] as unknown[]).filter(Boolean);
  }
  return [raw];
}

function typeName(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const t = (node as Record<string, unknown>)["@type"];
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t.find((x) => typeof x === "string") ?? null;
  return null;
}

/** Check a single parsed schema node against its required fields. */
function validateNode(
  node: unknown,
  url: string,
  persona: string,
  store: FindingStore,
): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = typeName(node);
  if (!type) return;

  // Strip namespace prefix (e.g. "schema:Article" → "Article")
  const localType = type.includes(":") ? type.split(":").pop()! : type;
  const required = REQUIRED_FIELDS[localType];
  if (!required) return;

  for (const field of required) {
    const val = obj[field];
    const missing =
      val === undefined ||
      val === null ||
      val === "" ||
      (Array.isArray(val) && val.length === 0);

    if (missing) {
      store.add({
        severity: "medium",
        category: "schema",
        title: `${localType} schema missing required field: ${field}`,
        detail:
          `The <script type="application/ld+json"> on this page contains a ${localType} ` +
          `node that is missing the required "${field}" property. ` +
          `Missing schema fields reduce AI/LLM citability and may fail Google's rich-result eligibility.`,
        url,
        persona,
        signatureKey: `schema:${localType}:${field}`,
      });
    }
  }

  // FAQPage-specific: each mainEntity item needs name + acceptedAnswer.text
  if (localType === "FAQPage" && Array.isArray(obj.mainEntity)) {
    for (const item of obj.mainEntity as unknown[]) {
      if (!item || typeof item !== "object") continue;
      const q = item as Record<string, unknown>;
      if (!q.name) {
        store.add({
          severity: "medium",
          category: "schema",
          title: "FAQPage mainEntity item missing name",
          detail: "Each FAQ question node must include a 'name' (the question text).",
          url,
          persona,
          signatureKey: "schema:FAQPage:mainEntity:name",
        });
      }
      const ans = q.acceptedAnswer as Record<string, unknown> | undefined;
      if (!ans?.text) {
        store.add({
          severity: "medium",
          category: "schema",
          title: "FAQPage mainEntity item missing acceptedAnswer.text",
          detail: "Each FAQ answer node must include acceptedAnswer.text (the answer body).",
          url,
          persona,
          signatureKey: "schema:FAQPage:mainEntity:acceptedAnswer",
        });
      }
    }
  }

  // BreadcrumbList: each item needs name + item (URL)
  if (localType === "BreadcrumbList" && Array.isArray(obj.itemListElement)) {
    for (const crumb of obj.itemListElement as unknown[]) {
      if (!crumb || typeof crumb !== "object") continue;
      const c = crumb as Record<string, unknown>;
      if (!c.name) {
        store.add({
          severity: "low",
          category: "schema",
          title: "BreadcrumbList item missing name",
          detail: "Each BreadcrumbList ListItem should have a 'name' property.",
          url,
          persona,
          signatureKey: "schema:BreadcrumbList:item:name",
        });
      }
    }
  }
}

/**
 * Extract and validate all JSON-LD blocks on the current page.
 * Findings are added to the store; nothing is returned.
 */
export async function checkSchemaMarkup(
  page: Page,
  store: FindingStore,
  persona: string,
): Promise<void> {
  try {
    const blocks = await page.evaluate((): string[] => {
      const scripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      );
      return scripts.map((s) => s.textContent ?? "").filter(Boolean);
    });

    const url = page.url();

    for (const block of blocks) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(block);
      } catch {
        store.add({
          severity: "low",
          category: "schema",
          title: "Malformed JSON-LD (parse error)",
          detail: `A <script type="application/ld+json"> block could not be parsed as JSON. ` +
            `First 200 chars: ${block.slice(0, 200)}`,
          url,
          persona,
          signatureKey: "schema:parse-error",
        });
        continue;
      }

      for (const node of flatten(parsed)) {
        validateNode(node, url, persona, store);
      }
    }
  } catch {
    // Page may have navigated away — silently skip.
  }
}
