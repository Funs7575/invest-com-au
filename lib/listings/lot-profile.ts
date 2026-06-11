import { z } from "zod";
import {
  humanizeTitle,
  formatMetricValue,
  listingDisplayMetrics,
  type DisplayMetric,
} from "@/lib/listing-format";

/**
 * Lot profile — the structured "catalogue entry" view of a listing's
 * `key_metrics` JSONB.
 *
 * The marketplace stores everything bespoke about a listing in
 * `investment_listings.key_metrics`. This module is the single place that
 * turns that free-form blob into the typed sections the lot page renders:
 *
 *   - **Structured modules** (all optional): `provenance_events[]`,
 *     `documents[]`, `comparable_sales[]`, `holding_costs[]`,
 *     `typical_time_to_sell`, `liquidity_note`. Sellers/admins opt in by
 *     writing these conventions; each array item is validated individually
 *     and bad entries are dropped, never thrown.
 *   - **Doc-ish scalars**: existing rows (e.g. the collectibles seeds) carry
 *     keys like `provenance`, `documentation`, `matching_numbers`,
 *     `service`. Those fold into the "paper trail" section automatically so
 *     the lot page lights up on real data without re-seeding.
 *   - **Facts**: whatever remains renders through the existing
 *     `listingDisplayMetrics` SSOT (skip-list + humanisation), so the fact
 *     grid stays consistent with cards.
 *
 * Parsing is total: any input shape returns a usable (possibly empty)
 * profile.
 */

export interface ProvenanceEvent {
  when?: string;
  label: string;
  detail?: string;
}

export type LotDocumentStatus = "provided" | "verified" | "pending";

export interface LotDocument {
  name: string;
  status: LotDocumentStatus;
  note?: string;
}

export interface ComparableSale {
  label: string;
  price?: string;
  when?: string;
  source?: string;
}

export interface HoldingCost {
  label: string;
  amount?: string;
  note?: string;
}

export interface PaperTrailFact {
  label: string;
  detail: string;
}

export interface LotProfile {
  /** Curated key-metrics grid (price/yield/noise already skipped). */
  facts: DisplayMetric[];
  /** Doc-ish scalar keys folded into provenance/paper-trail facts. */
  paperTrail: PaperTrailFact[];
  provenanceEvents: ProvenanceEvent[];
  documents: LotDocument[];
  comparables: ComparableSale[];
  holdingCosts: HoldingCost[];
  timeToSell?: string;
  liquidityNote?: string;
}

const asText = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .pipe(z.string().min(1).max(300));

const ProvenanceEventSchema = z.object({
  when: asText.optional(),
  year: asText.optional(),
  label: asText,
  detail: asText.optional(),
});

const DocumentSchema = z.object({
  name: asText,
  status: z.enum(["provided", "verified", "pending"]).catch("provided"),
  note: asText.optional(),
});

const ComparableSchema = z.object({
  label: asText,
  price: asText.optional(),
  when: asText.optional(),
  source: asText.optional(),
});

const HoldingCostSchema = z.object({
  label: asText,
  amount: asText.optional(),
  note: asText.optional(),
});

/** Reserved structured keys — consumed by this parser, never shown in the
 *  generic fact grid. */
const STRUCTURED_KEYS = new Set([
  "provenance_events",
  "documents",
  "comparable_sales",
  "holding_costs",
  "typical_time_to_sell",
  "liquidity_note",
]);

/** Scalar keys that read as evidence/paper-trail rather than specs. Matched
 *  as whole key or by stem so seeded data (`provenance`, `documentation`,
 *  `history_file`, `service`, `grading`…) is picked up without listing every
 *  variant. */
const PAPER_TRAIL_KEY =
  /(provenance|document|history|certificat|grading|graded|registration|rego\b|licen[cs]e|permit|valuation|survey|inspection|warranty|service|restoration|books|build_sheet|matching_numbers|title_search|coa\b)/i;

function parseItems<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
    if (out.length >= 20) break;
  }
  return out;
}

function parseScalarText(value: unknown, max = 200): string | undefined {
  const parsed = asText.safeParse(value);
  if (!parsed.success) return undefined;
  return parsed.data.slice(0, max);
}

/** Max entries surfaced in the detail-page fact grid. */
const FACT_LIMIT = 12;

export function buildLotProfile(
  km: Record<string, unknown> | null | undefined,
): LotProfile {
  const metrics = km ?? {};

  const provenanceEvents = parseItems(
    metrics.provenance_events,
    ProvenanceEventSchema,
  ).map((e) => ({
    when: e.when ?? e.year,
    label: e.label,
    detail: e.detail,
  }));

  const documents = parseItems(metrics.documents, DocumentSchema);
  const comparables = parseItems(metrics.comparable_sales, ComparableSchema);
  const holdingCosts = parseItems(metrics.holding_costs, HoldingCostSchema);

  const paperTrail: PaperTrailFact[] = [];
  const factSource: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (STRUCTURED_KEYS.has(key)) continue;
    if (value == null || value === "") continue;
    if (
      PAPER_TRAIL_KEY.test(key) &&
      (typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number")
    ) {
      paperTrail.push({
        label: humanizeTitle(key),
        detail: formatMetricValue(key, value),
      });
      continue;
    }
    factSource[key] = value;
  }

  // `stage` sits on the card formatter's skip-list (derivation input —
  // the kind badge reflects it on compact cards), but on the lot page
  // "exploration / construction / operating" is substantive detail the
  // old Object.entries renders always showed. Surface it explicitly.
  const facts = listingDisplayMetrics(factSource, FACT_LIMIT);
  const stage = parseScalarText(metrics.stage, 40);
  if (stage) {
    facts.unshift({
      key: "stage",
      label: "Stage",
      value: humanizeTitle(stage),
    });
  }

  return {
    facts,
    paperTrail: paperTrail.slice(0, 12),
    provenanceEvents,
    documents,
    comparables,
    holdingCosts,
    timeToSell: parseScalarText(metrics.typical_time_to_sell, 80),
    liquidityNote: parseScalarText(metrics.liquidity_note, 280),
  };
}

/** True when the lot has any provenance/document evidence to show. */
export function hasPaperTrail(profile: LotProfile): boolean {
  return (
    profile.paperTrail.length > 0 ||
    profile.provenanceEvents.length > 0 ||
    profile.documents.length > 0
  );
}
