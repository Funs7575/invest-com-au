/**
 * Finding model — the structured unit of everything the fleet discovers.
 *
 * Pure module. A Finding is deduplicated by a stable `id` derived from its
 * category + normalized URL + a discriminating key, so the same broken thing
 * seen by 50 bots collapses to one row with an occurrence count.
 */

import { createHash } from "node:crypto";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "console-error" // uncaught console.error in the page
  | "page-error" // unhandled exception / rejection in the page
  | "network-error" // request failed (DNS, abort, connection)
  | "http-error" // first-party response with status >= 400
  | "broken-link" // internal <a> resolving to 4xx/5xx
  | "a11y" // axe-core serious/critical violation
  | "dead-end" // navigation produced an empty/error shell
  | "ux" // AI judge: confusing/broken user experience
  | "compliance" // AI judge: missing required financial disclosure
  | "flow-failure" // a scripted/AI flow could not complete a step
  | "schema" // JSON-LD structured data missing required fields (GEO/AI-citation risk)
  | "safety"; // the safety net had to intercept something unexpected

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export interface FindingInput {
  severity: Severity;
  category: FindingCategory;
  /** Short human title, e.g. "500 on /api/quiz/submit". */
  title: string;
  /** Longer explanation / message body. */
  detail: string;
  /** Route or URL where it occurred. */
  url: string;
  /** Persona / bot that hit it. */
  persona?: string;
  /**
   * Overrides the dedupe discriminator. Defaults to `title`. Use a stable key
   * (axe rule id, HTTP status, error class) so cosmetic title differences
   * don't fragment a single underlying issue.
   */
  signatureKey?: string;
  /** Arbitrary structured context (status, selector, axe nodes, screenshot). */
  evidence?: Record<string, unknown>;
}

export interface Finding extends Omit<FindingInput, "signatureKey"> {
  /** Stable dedupe id. */
  id: string;
  /** How many times this exact finding was observed. */
  occurrences: number;
  /** ISO timestamp first seen. */
  firstSeenAt: string;
  /** Distinct URLs where it was seen (capped). */
  sampleUrls: string[];
  /** Distinct personas that hit it (capped). */
  personas: string[];
}

/** Strip origin, query and hash; collapse id-like path segments to `:id`. */
export function normalizeUrl(url: string): string {
  let pathname = url;
  try {
    // Accept both absolute and root-relative URLs.
    pathname = new URL(url, "http://x").pathname;
  } catch {
    const q = url.indexOf("?");
    pathname = q >= 0 ? url.slice(0, q) : url;
  }
  return pathname
    .split("/")
    .map((seg) => {
      if (/^\d+$/.test(seg)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
        return ":id";
      }
      if (/^[0-9a-f]{16,}$/i.test(seg)) return ":id";
      return seg;
    })
    .join("/");
}

export function findingSignature(input: FindingInput): string {
  const key = input.signatureKey ?? input.title;
  const basis = `${input.category}::${normalizeUrl(input.url)}::${key}`;
  return createHash("sha1").update(basis).digest("hex").slice(0, 12);
}
