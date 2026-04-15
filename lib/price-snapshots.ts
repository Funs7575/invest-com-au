/**
 * Broker + commodity price snapshot helpers.
 *
 * Snapshots are captured hourly by the broker-snapshot cron and
 * rendered on history charts. This lib provides:
 *
 *   - captureBrokerSnapshot(broker)     — write one row
 *   - captureBrokerSnapshotsBatch(list) — batched write
 *   - readBrokerHistory(slug, since)    — read a time-window slice
 *   - readLatestBrokerSnapshot(slug)    — most-recent row for a broker
 *   - captureCommoditySnapshot(input)   — write one commodity row
 *   - readCommodityHistory(input)       — time-window slice
 *
 * Parsing-friendly: every fee field is stored both as a free-text
 * string ("$3.00") and a numeric ("3.00") where we could parse it
 * from the broker row. The numeric powers charts, the string powers
 * the display.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("price-snapshots");

// ─── Broker snapshots ────────────────────────────────────────────

export interface BrokerRow {
  id: number;
  slug: string;
  status?: string | null;
  asx_fee?: string | null;
  us_fee?: string | null;
  fx_rate?: number | null;
  inactivity_fee?: string | null;
  min_deposit?: string | null;
  deal?: string | null;
  deal_text?: string | null;
  deal_expiry?: string | null;
}

export interface BrokerSnapshotRow {
  id: number;
  broker_id: number;
  broker_slug: string;
  captured_at: string;
  asx_fee: string | null;
  asx_fee_value: number | null;
  us_fee: string | null;
  us_fee_value: number | null;
  fx_rate: number | null;
  inactivity_fee: string | null;
  inactivity_fee_value: number | null;
  min_deposit: string | null;
  min_deposit_value: number | null;
  deal: string | null;
  deal_text: string | null;
  deal_expiry: string | null;
  status: string;
  source: string;
}

/**
 * Extract a best-effort numeric from a free-text fee string.
 *
 * Examples:
 *   "$3.00"          → 3
 *   "$3 or 0.10%"    → 3        (first number wins)
 *   "0.50% min $5"   → 0.5      (percent sign wins over $)
 *   "Free"           → 0
 *   "N/A"            → null
 *   null             → null
 *
 * Percent signals are preserved — if the string contains "%" we
 * return the percent value. If it contains "$", we return the
 * dollar value. Used for charting only; the free-text version is
 * always the one we display.
 */
export function parseFeeNumeric(input: string | null | undefined): number | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (/^(free|none|n\/?a|unknown)$/i.test(s)) {
    return /^(free|none)$/i.test(s) ? 0 : null;
  }
  // Percentage takes precedence — "0.50% min $5" → 0.5
  const pctMatch = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    const n = parseFloat(pctMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  // Dollar amount next
  const dollarMatch = s.match(/\$\s*(\d+(?:\.\d+)?)/);
  if (dollarMatch) {
    const n = parseFloat(dollarMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  // Bare number fallback
  const bareMatch = s.match(/(\d+(?:\.\d+)?)/);
  if (bareMatch) {
    const n = parseFloat(bareMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function captureBrokerSnapshot(
  broker: BrokerRow,
  source: "cron" | "manual" | "backfill" = "cron",
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("broker_price_snapshots").insert({
      broker_id: broker.id,
      broker_slug: broker.slug,
      asx_fee: broker.asx_fee ?? null,
      asx_fee_value: parseFeeNumeric(broker.asx_fee),
      us_fee: broker.us_fee ?? null,
      us_fee_value: parseFeeNumeric(broker.us_fee),
      fx_rate: broker.fx_rate ?? null,
      inactivity_fee: broker.inactivity_fee ?? null,
      inactivity_fee_value: parseFeeNumeric(broker.inactivity_fee),
      min_deposit: broker.min_deposit ?? null,
      min_deposit_value: parseFeeNumeric(broker.min_deposit),
      deal: broker.deal ?? null,
      deal_text: broker.deal_text ?? null,
      deal_expiry: broker.deal_expiry ?? null,
      status: broker.status || "active",
      source,
    });
    if (error) {
      log.warn("broker snapshot insert failed", { error: error.message, slug: broker.slug });
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

export interface CaptureBatchResult {
  total: number;
  succeeded: number;
  failed: number;
}

export async function captureBrokerSnapshotsBatch(
  brokers: BrokerRow[],
  source: "cron" | "manual" | "backfill" = "cron",
): Promise<CaptureBatchResult> {
  let succeeded = 0;
  let failed = 0;
  for (const b of brokers) {
    const r = await captureBrokerSnapshot(b, source);
    if (r.ok) succeeded += 1;
    else failed += 1;
  }
  return { total: brokers.length, succeeded, failed };
}

export async function readBrokerHistory(
  slug: string,
  sinceIso: string,
): Promise<BrokerSnapshotRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("broker_price_snapshots")
      .select("*")
      .eq("broker_slug", slug)
      .gte("captured_at", sinceIso)
      .order("captured_at", { ascending: true })
      .limit(2000);
    return (data as BrokerSnapshotRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function readLatestBrokerSnapshot(
  slug: string,
): Promise<BrokerSnapshotRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("broker_price_snapshots")
      .select("*")
      .eq("broker_slug", slug)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as BrokerSnapshotRow | null) || null;
  } catch {
    return null;
  }
}

// ─── Commodity snapshots ────────────────────────────────────────

export type CommodityEntityKind = "stock" | "etf" | "spot";

export interface CommoditySnapshotInput {
  entityKind: CommodityEntityKind;
  entityRef: string;
  sectorSlug?: string | null;
  priceMinorUnits?: number | null;
  currency?: string;
  dividendYieldPct?: number | null;
  peRatio?: number | null;
  merPct?: number | null;
  source?: "cron" | "manual" | "backfill";
}

export interface CommoditySnapshotRow {
  id: number;
  entity_kind: CommodityEntityKind;
  entity_ref: string;
  sector_slug: string | null;
  captured_at: string;
  price_minor_units: number | null;
  currency: string;
  dividend_yield_pct: number | null;
  pe_ratio: number | null;
  mer_pct: number | null;
  source: string;
}

export async function captureCommoditySnapshot(
  input: CommoditySnapshotInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("commodity_price_snapshots").insert({
      entity_kind: input.entityKind,
      entity_ref: input.entityRef.toUpperCase(),
      sector_slug: input.sectorSlug ?? null,
      price_minor_units: input.priceMinorUnits ?? null,
      currency: input.currency || "AUD",
      dividend_yield_pct: input.dividendYieldPct ?? null,
      pe_ratio: input.peRatio ?? null,
      mer_pct: input.merPct ?? null,
      source: input.source || "cron",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function readCommodityHistory(input: {
  entityKind: CommodityEntityKind;
  entityRef: string;
  sinceIso: string;
}): Promise<CommoditySnapshotRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_price_snapshots")
      .select("*")
      .eq("entity_kind", input.entityKind)
      .eq("entity_ref", input.entityRef.toUpperCase())
      .gte("captured_at", input.sinceIso)
      .order("captured_at", { ascending: true })
      .limit(2000);
    return (data as CommoditySnapshotRow[] | null) || [];
  } catch {
    return [];
  }
}

// ─── Fee freshness classification (used for badges) ─────────────

export type FreshnessTier = "fresh" | "recent" | "stale" | "unknown";

/**
 * Classify how fresh a broker's snapshot is. Drives the
 * FeeFreshnessBadge colour on broker cards + detail pages.
 *
 *   fresh  — snapshot within the last 6h
 *   recent — within the last 36h
 *   stale  — older than 36h
 *   unknown — never snapshotted
 */
export function classifyFreshness(
  capturedAt: string | null | undefined,
  now: Date = new Date(),
): FreshnessTier {
  if (!capturedAt) return "unknown";
  const captured = new Date(capturedAt).getTime();
  if (Number.isNaN(captured)) return "unknown";
  const diffHours = (now.getTime() - captured) / (1000 * 60 * 60);
  if (diffHours <= 6) return "fresh";
  if (diffHours <= 36) return "recent";
  return "stale";
}
