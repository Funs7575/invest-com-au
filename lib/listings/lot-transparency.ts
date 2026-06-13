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
