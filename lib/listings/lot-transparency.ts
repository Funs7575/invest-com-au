import { hasPaperTrail, type LotProfile } from "@/lib/listings/lot-profile";

/**
 * Listing-transparency assessment — the buyer-facing completeness meter on
 * the lot page.
 *
 * Frames completeness from the buyer's side ("what this listing states /
 * what's worth requesting") rather than scoring the seller. The checks are
 * deliberately factual — presence of information, never quality of the
 * asset — so the meter can render on every listing without implying any
 * recommendation.
 */

export type TransparencyLevel = "essential" | "documented" | "comprehensive";

export interface TransparencyCheck {
  id: string;
  /** Buyer-framed label, e.g. "Pricing stated". */
  label: string;
  met: boolean;
}

export interface LotTransparency {
  level: TransparencyLevel;
  /** 0–100, met/total rounded. */
  score: number;
  checks: TransparencyCheck[];
  metCount: number;
  total: number;
}

export interface TransparencyInput {
  asking_price_cents?: number | null;
  price_display?: string | null;
  description?: string | null;
  images?: string[] | null;
  location_state?: string | null;
  location_city?: string | null;
}

const LEVEL_LABELS: Record<TransparencyLevel, string> = {
  essential: "Essentials stated",
  documented: "Well documented",
  comprehensive: "Comprehensively documented",
};

export function transparencyLevelLabel(level: TransparencyLevel): string {
  return LEVEL_LABELS[level];
}

export function assessLotTransparency(
  listing: TransparencyInput,
  profile: LotProfile,
): LotTransparency {
  const checks: TransparencyCheck[] = [
    {
      id: "pricing",
      label: "Pricing stated",
      met: Boolean(listing.price_display) || Boolean(listing.asking_price_cents),
    },
    {
      id: "description",
      label: "Detailed description",
      met: (listing.description ?? "").trim().length >= 300,
    },
    {
      id: "photos",
      label: "Photos provided",
      met: (listing.images ?? []).length >= 2,
    },
    {
      id: "location",
      label: "Location stated",
      met: Boolean(listing.location_state) || Boolean(listing.location_city),
    },
    {
      id: "facts",
      label: "Key facts itemised",
      met: profile.facts.length >= 4,
    },
    {
      id: "paper_trail",
      label: "Provenance / documents noted",
      met: hasPaperTrail(profile),
    },
    {
      id: "costs",
      label: "Holding costs disclosed",
      met: profile.holdingCosts.length >= 1,
    },
    {
      id: "liquidity",
      label: "Time-to-sell guidance",
      met: Boolean(profile.timeToSell) || Boolean(profile.liquidityNote),
    },
  ];

  const metCount = checks.filter((c) => c.met).length;
  const total = checks.length;
  const level: TransparencyLevel =
    metCount >= 7 ? "comprehensive" : metCount >= 4 ? "documented" : "essential";

  return {
    level,
    score: Math.round((metCount / total) * 100),
    checks,
    metCount,
    total,
  };
}

// ─── Lite assessment (client-bundle-safe) ────────────────────────────────

/** The slice of a listing row the lite assessment needs. */
export interface TransparencyLiteInput extends TransparencyInput {
  key_metrics?: Record<string, unknown> | null;
}

const LITE_STRUCTURED_KEYS = new Set([
  "provenance_events", "documents", "comparable_sales", "holding_costs",
]);
const LITE_PAPER_TRAIL_KEY =
  /provenance|document|certificat|grading|regauge|registr|title|assay|matching_numbers|chain_of_custody/i;

/**
 * Approximate transparency for listing CARDS without importing the
 * zod-backed lot-profile parser — `buildLotProfile` would drag zod into
 * the shared client chunks via ListingCard (the bundle budget caught
 * exactly that). Same checks, heuristic facts/paper-trail/costs detection;
 * the lot page keeps the exact assessment.
 */
export function assessLotTransparencyLite(listing: TransparencyLiteInput): LotTransparency {
  const km = (listing.key_metrics ?? {}) as Record<string, unknown>;
  const keys = Object.keys(km).filter((k) => km[k] != null && km[k] !== "");
  const factishKeys = keys.filter(
    (k) => !LITE_STRUCTURED_KEYS.has(k) && !LITE_PAPER_TRAIL_KEY.test(k),
  );
  const hasPaperTrailSignal =
    Array.isArray(km["documents"]) && (km["documents"] as unknown[]).length > 0 ||
    Array.isArray(km["provenance_events"]) && (km["provenance_events"] as unknown[]).length > 0 ||
    keys.some((k) => LITE_PAPER_TRAIL_KEY.test(k));
  const hasCosts =
    Array.isArray(km["holding_costs"]) && (km["holding_costs"] as unknown[]).length > 0;
  const hasLiquidity =
    Boolean(km["typical_time_to_sell"]) || Boolean(km["liquidity_note"]);

  const checks: TransparencyCheck[] = [
    {
      id: "pricing",
      label: "Pricing stated",
      met: Boolean(listing.price_display) || Boolean(listing.asking_price_cents),
    },
    {
      id: "description",
      label: "Detailed description",
      met: (listing.description ?? "").trim().length >= 300,
    },
    {
      id: "photos",
      label: "Photos provided",
      met: (listing.images ?? []).length >= 2,
    },
    {
      id: "location",
      label: "Location stated",
      met: Boolean(listing.location_state) || Boolean(listing.location_city),
    },
    { id: "facts", label: "Key facts itemised", met: factishKeys.length >= 4 },
    { id: "paper_trail", label: "Provenance / documents noted", met: hasPaperTrailSignal },
    { id: "costs", label: "Holding costs disclosed", met: hasCosts },
    { id: "liquidity", label: "Time-to-sell guidance", met: hasLiquidity },
  ];

  const metCount = checks.filter((c) => c.met).length;
  const total = checks.length;
  const level: TransparencyLevel =
    metCount >= 7 ? "comprehensive" : metCount >= 4 ? "documented" : "essential";
  return { level, score: Math.round((metCount / total) * 100), checks, metCount, total };
}

