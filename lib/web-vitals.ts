/**
 * Web vitals capture + rollup.
 *
 * The client calls /api/web-vitals on each navigation with LCP,
 * INP, CLS, FCP, TTFB samples. We store raw events in
 * web_vitals_samples (7-day retention) and a nightly cron
 * rolls them up into web_vitals_daily_rollup.
 *
 * Thresholds match Google's Core Web Vitals scoring:
 *   LCP    good ≤ 2500ms, poor > 4000ms
 *   INP    good ≤ 200ms, poor > 500ms
 *   CLS    good ≤ 0.1,   poor > 0.25
 *   FCP    good ≤ 1800ms, poor > 3000ms
 *   TTFB   good ≤ 800ms, poor > 1800ms
 *
 * Keeping these in code (not the DB) means a future Google
 * threshold update is a one-line change.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger("web-vitals");

export type WebVitalsMetric = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type VitalsRating = "good" | "needs-improvement" | "poor";
export type DeviceKind = "desktop" | "mobile" | "tablet";

const THRESHOLDS: Record<WebVitalsMetric, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Classify a raw metric value against the Google CWV thresholds.
 * Pure function — safe to call client-side too.
 */
export function classifyVital(
  metric: WebVitalsMetric,
  value: number,
): VitalsRating {
  const t = THRESHOLDS[metric];
  if (!t) return "needs-improvement";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

export function isValidMetric(v: unknown): v is WebVitalsMetric {
  return typeof v === "string" && ["LCP", "INP", "CLS", "FCP", "TTFB"].includes(v);
}

/**
 * Normalise a free-text user-agent hint into a coarse bucket.
 */
export function classifyDevice(ua: string | null | undefined): DeviceKind {
  if (!ua) return "desktop";
  const u = ua.toLowerCase();
  if (/ipad|tablet/.test(u)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(u)) return "mobile";
  return "desktop";
}

// ─── Sample capture ──────────────────────────────────────────────

export interface VitalsSample {
  metric: WebVitalsMetric;
  value: number;
  pagePath: string;
  deviceKind?: DeviceKind | null;
  sessionId?: string | null;
}

function hashSession(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null;
  const salt = process.env.IP_HASH_SALT || "invest-com-au";
  return createHash("sha256").update(sessionId + salt).digest("hex").slice(0, 32);
}

export async function captureSample(
  input: VitalsSample,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidMetric(input.metric)) {
    return { ok: false, error: "invalid_metric" };
  }
  if (!Number.isFinite(input.value) || input.value < 0) {
    return { ok: false, error: "invalid_value" };
  }
  // Defensive upper bounds — nothing in a real CWV stream goes
  // above these. Values outside the range are almost certainly
  // hostile clients trying to pollute the percentiles.
  const caps: Record<WebVitalsMetric, number> = {
    LCP: 60_000,
    INP: 10_000,
    CLS: 10,
    FCP: 60_000,
    TTFB: 60_000,
  };
  if (input.value > caps[input.metric]) {
    return { ok: false, error: "value_out_of_range" };
  }
  if (!input.pagePath || input.pagePath.length > 500) {
    return { ok: false, error: "invalid_page_path" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("web_vitals_samples").insert({
      metric: input.metric,
      value: input.value,
      rating: classifyVital(input.metric, input.value),
      page_path: input.pagePath,
      device_kind: input.deviceKind ?? "desktop",
      session_hash: hashSession(input.sessionId),
    });
    if (error) {
      log.warn("web_vitals_samples insert failed", { error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Percentile math ─────────────────────────────────────────────

/**
 * Pure function: compute p50/p75/p95 of a numeric array.
 * Used by the rollup cron and testable in isolation.
 */
export function computePercentiles(
  values: number[],
): { p50: number; p75: number; p95: number } {
  if (values.length === 0) return { p50: 0, p75: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (p: number) => {
    const idx = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor((sorted.length - 1) * p)),
    );
    return sorted[idx];
  };
  return { p50: pick(0.5), p75: pick(0.75), p95: pick(0.95) };
}

export function computeRatingShare(ratings: (VitalsRating | null)[]): {
  good_pct: number;
  poor_pct: number;
} {
  if (ratings.length === 0) return { good_pct: 0, poor_pct: 0 };
  const good = ratings.filter((r) => r === "good").length;
  const poor = ratings.filter((r) => r === "poor").length;
  return {
    good_pct: Math.round((good / ratings.length) * 1000) / 10,
    poor_pct: Math.round((poor / ratings.length) * 1000) / 10,
  };
}

// ─── Rollup ──────────────────────────────────────────────────────

export interface RollupResult {
  date: string;
  groups: number;
  samples: number;
  inserted: number;
}

/**
 * Aggregate yesterday's raw samples into web_vitals_daily_rollup.
 * Called from /api/cron/web-vitals-rollup (runs daily).
 * Idempotent via the (run_date, metric, page_path, device_kind)
 * unique constraint — a second run of the same day upserts.
 */
export async function rollupYesterday(): Promise<RollupResult> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const runDate = yesterday.toISOString().slice(0, 10);
  const from = `${runDate}T00:00:00Z`;
  const to = `${runDate}T23:59:59Z`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("web_vitals_samples")
    .select("metric, value, rating, page_path, device_kind")
    .gte("created_at", from)
    .lte("created_at", to)
    .limit(100_000);

  if (error) {
    log.warn("web_vitals rollup fetch failed", { error: error.message });
    return { date: runDate, groups: 0, samples: 0, inserted: 0 };
  }

  const rows =
    (data as Array<{
      metric: WebVitalsMetric;
      value: number;
      rating: VitalsRating | null;
      page_path: string;
      device_kind: DeviceKind | null;
    }> | null) || [];

  // Group key: metric|page_path|device
  interface Bucket {
    values: number[];
    ratings: (VitalsRating | null)[];
    metric: WebVitalsMetric;
    page_path: string;
    device_kind: DeviceKind;
  }
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const device: DeviceKind = r.device_kind || "desktop";
    const key = `${r.metric}|${r.page_path}|${device}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        values: [],
        ratings: [],
        metric: r.metric,
        page_path: r.page_path,
        device_kind: device,
      };
      buckets.set(key, b);
    }
    b.values.push(Number(r.value));
    b.ratings.push(r.rating);
  }

  let inserted = 0;
  for (const [, b] of buckets) {
    const { p50, p75, p95 } = computePercentiles(b.values);
    const { good_pct, poor_pct } = computeRatingShare(b.ratings);
    const { error: upErr } = await supabase
      .from("web_vitals_daily_rollup")
      .upsert(
        {
          run_date: runDate,
          metric: b.metric,
          page_path: b.page_path,
          device_kind: b.device_kind,
          sample_count: b.values.length,
          p50,
          p75,
          p95,
          good_pct,
          poor_pct,
        },
        { onConflict: "run_date,metric,page_path,device_kind" },
      );
    if (!upErr) inserted += 1;
  }

  return {
    date: runDate,
    groups: buckets.size,
    samples: rows.length,
    inserted,
  };
}
