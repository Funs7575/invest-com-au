/**
 * Placement A/B testing — shared types + variant assignment.
 *
 * W5.26 — rotate which broker appears in position 1 on /best/<slug> pages.
 * Editorial configures experiments in /admin/placement-experiments; the
 * `/best/[slug]` server component picks a variant per request and reorders
 * the broker list before render. Impression + click events are aggregated
 * into the row's `metrics` jsonb via the `increment_placement_event` RPC.
 *
 * Assignment is deterministic for stability — same fingerprint within the
 * same experiment always sees the same variant. That keeps the order stable
 * across the visitor's tabs/refreshes within a session (and across sessions
 * if the upstream IP is sticky, which is the common case for residential
 * connections). Weighted random fallback applies when no fingerprint exists.
 */
import type { Broker } from "./types";

/** Variant labels are short identifiers — keep stable; they key into metrics. */
export const VARIANT_LABEL_PATTERN = /^[a-z0-9][a-z0-9_-]{0,30}$/;

export type PlacementExperimentStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed";

export type PlacementEventType = "impressions" | "clicks" | "conversions";

/** Single A/B variant — `broker_slug = null` means "no override" (control). */
export interface PlacementVariant {
  /** Stable identifier; metrics counters key off this. */
  label: string;
  /** Slug of the broker to promote to position 1, or null for control. */
  broker_slug: string | null;
  /** Relative weight for random assignment; must be > 0. */
  weight: number;
}

export interface PlacementVariantMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface PlacementExperiment {
  id: number;
  slug: string;
  name: string;
  status: PlacementExperimentStatus;
  variants: PlacementVariant[];
  metrics: Record<string, Partial<PlacementVariantMetrics>>;
  notes: string | null;
  winner_variant: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * 32-bit FNV-1a — good-enough deterministic hash for variant bucketing.
 * Not cryptographic; we just need a uniform-ish distribution over a 32-bit
 * space so the modulo against `totalWeight` is unbiased for typical weights.
 */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // imul keeps the 32-bit overflow semantics — without it the hash drifts
    // into doubles and adjacent inputs map to nearby buckets.
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick a variant deterministically from a fingerprint string.
 * - When `fingerprint` is non-empty: hash with the experiment id, pick by
 *   weighted bucket. Same fingerprint + same experiment → same variant.
 * - When `fingerprint` is empty (server can't read headers / no IP): fall
 *   back to weighted random so test still rotates instead of pinning to one.
 */
export function pickVariant(
  experiment: Pick<PlacementExperiment, "id" | "variants">,
  fingerprint: string,
): PlacementVariant {
  const variants = experiment.variants;
  if (variants.length === 0) {
    throw new Error("placement-experiments: variants array is empty");
  }

  const totalWeight = variants.reduce(
    (sum, v) => sum + (v.weight > 0 ? v.weight : 0),
    0,
  );
  if (totalWeight <= 0) {
    // Misconfigured (all weights zero) — fall back to the first variant.
    return variants[0]!;
  }

  let bucket: number;
  if (fingerprint && fingerprint.length > 0) {
    const h = fnv1a32(`${experiment.id}:${fingerprint}`);
    bucket = h % totalWeight;
  } else {
    bucket = Math.floor(Math.random() * totalWeight);
  }

  let acc = 0;
  for (const v of variants) {
    if (v.weight <= 0) continue;
    acc += v.weight;
    if (bucket < acc) return v;
  }
  // Numerically unreachable when totalWeight > 0; satisfy the type checker.
  return variants[variants.length - 1]!;
}

/**
 * Reorder `brokers` so the variant's `broker_slug` (if any) sits at
 * position 0. No-ops when:
 *   - variant.broker_slug is null (control)
 *   - the slug isn't in the list (e.g. broker went inactive after launch)
 *   - the slug is already in position 0
 *
 * Returns a new array; never mutates the input.
 */
export function applyPlacementVariant(
  brokers: Broker[],
  variant: PlacementVariant,
): Broker[] {
  if (!variant.broker_slug) return [...brokers];
  const idx = brokers.findIndex((b) => b.slug === variant.broker_slug);
  if (idx <= 0) return [...brokers];
  const next = [...brokers];
  const [promoted] = next.splice(idx, 1);
  if (!promoted) return next;
  next.unshift(promoted);
  return next;
}

/** Coerce a DB row's `variants`/`metrics` jsonb into typed values. Defensive. */
export function normaliseVariants(raw: unknown): PlacementVariant[] {
  if (!Array.isArray(raw)) return [];
  const out: PlacementVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const label = typeof obj.label === "string" ? obj.label : null;
    const brokerSlug =
      typeof obj.broker_slug === "string"
        ? obj.broker_slug
        : obj.broker_slug === null
          ? null
          : null;
    const weight =
      typeof obj.weight === "number" && Number.isFinite(obj.weight)
        ? obj.weight
        : 0;
    if (!label) continue;
    out.push({ label, broker_slug: brokerSlug, weight });
  }
  return out;
}

export function normaliseMetrics(
  raw: unknown,
): Record<string, Partial<PlacementVariantMetrics>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, Partial<PlacementVariantMetrics>> = {};
  for (const [label, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const entry: Partial<PlacementVariantMetrics> = {};
    if (typeof v.impressions === "number") entry.impressions = v.impressions;
    if (typeof v.clicks === "number") entry.clicks = v.clicks;
    if (typeof v.conversions === "number") entry.conversions = v.conversions;
    out[label] = entry;
  }
  return out;
}

/** Compute CTR = clicks / impressions (0 when denominator is 0). */
export function ctr(metrics: Partial<PlacementVariantMetrics> | undefined): number {
  if (!metrics?.impressions || metrics.impressions === 0) return 0;
  return (metrics.clicks ?? 0) / metrics.impressions;
}

/** Compute conversion rate = conversions / impressions. */
export function conversionRate(
  metrics: Partial<PlacementVariantMetrics> | undefined,
): number {
  if (!metrics?.impressions || metrics.impressions === 0) return 0;
  return (metrics.conversions ?? 0) / metrics.impressions;
}
