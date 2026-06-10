/**
 * lib/ideal-client-display.ts
 *
 * Maps an advisor's structured ideal-client criteria (the JSONB written by
 * /api/advisor-portal/ideal-client) into plain-English display groups for the
 * public profile's "Who I Work With" section.
 *
 * COMPLIANCE: output is a factual restatement of the advisor's own stated
 * preferences — never a suitability claim. Render alongside the existing
 * "factual match, not personal advice" framing.
 *
 * Pure function — no I/O.
 */

import type { IdealClientCriteria } from "@/lib/advisor-profile-match";

export interface IdealClientDisplayGroup {
  /** Stable key for React lists / tests. */
  key: "verticals" | "budget_bands" | "archetypes" | "experience_levels";
  label: string;
  values: string[];
}

const VERTICAL_LABELS: Record<string, string> = {
  property: "Property investors",
  etf: "ETF investors",
  shares: "Share investors",
  crypto: "Crypto investors",
  bonds: "Bond investors",
  smsf: "SMSF trustees",
  insurance: "Insurance clients",
  superannuation: "Superannuation members",
  mortgage: "Home loan borrowers",
  business: "Business & commercial clients",
};

const BUDGET_LABELS: Record<string, string> = {
  under_100k: "Under $100k",
  "100k_250k": "$100k–$250k",
  "250k_500k": "$250k–$500k",
  "500k_1m": "$500k–$1m",
  "1m_5m": "$1m–$5m",
  "5m_plus": "$5m+",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  fhb: "First home buyers",
  hnw: "High-net-worth investors",
  pre_retiree: "Pre-retirees",
  business_owner: "Business owners",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "New investors",
  intermediate: "Intermediate investors",
  advanced: "Experienced investors",
};

function mapKnown(values: string[] | undefined, labels: Record<string, string>): string[] {
  if (!values || values.length === 0) return [];
  // Unknown values (vocabulary drift) are dropped rather than rendered raw —
  // a snake_case token on the public profile is worse than omission.
  return values.map((v) => labels[v]).filter((label): label is string => typeof label === "string");
}

/**
 * Returns the non-empty display groups for a criteria object, in a fixed
 * render order. Returns [] when there is nothing displayable (caller hides
 * the section).
 */
export function describeIdealClientCriteria(
  criteria: IdealClientCriteria | null | undefined,
): IdealClientDisplayGroup[] {
  if (!criteria) return [];

  const groups: IdealClientDisplayGroup[] = [
    { key: "archetypes", label: "Client types", values: mapKnown(criteria.archetypes, ARCHETYPE_LABELS) },
    { key: "verticals", label: "Focus areas", values: mapKnown(criteria.verticals, VERTICAL_LABELS) },
    {
      key: "budget_bands",
      label: "Typical investment range",
      values: mapKnown(criteria.budget_bands, BUDGET_LABELS),
    },
    {
      key: "experience_levels",
      label: "Experience levels",
      values: mapKnown(criteria.experience_levels, EXPERIENCE_LABELS),
    },
  ];

  return groups.filter((g) => g.values.length > 0);
}
