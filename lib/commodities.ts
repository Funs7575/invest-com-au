/**
 * Commodity sector engine.
 *
 * Read/write helpers for the commodity_* tables. These power
 * the /invest/<sector> hub pages plus the admin "launch new
 * vertical" scaffolder.
 *
 * Every function is async and never throws — the hub pages need
 * to degrade gracefully on DB errors so a transient Supabase
 * outage doesn't take down SEO traffic.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("commodities");

export type EsgRiskRating = "low" | "medium" | "high";
export type MarketCapBucket = "mega" | "large" | "mid" | "small" | "spec";
export type ExposureKind = "producer" | "explorer" | "service" | "royalty";
export type SectorStatus = "active" | "draft" | "retired";
export type ReferenceStatus = "active" | "watch" | "removed";
export type NewsBriefStatus = "draft" | "published" | "retired";

export interface CommoditySector {
  id: number;
  slug: string;
  display_name: string;
  hero_description: string;
  hero_stats: Record<string, string> | null;
  esg_risk_rating: EsgRiskRating;
  regulator_notes: string | null;
  status: SectorStatus;
  launched_at: string | null;
  display_order: number;
}

export interface CommodityStock {
  id: number;
  sector_slug: string;
  ticker: string;
  company_name: string;
  market_cap_bucket: MarketCapBucket | null;
  dividend_yield_pct: number | null;
  pe_ratio: number | null;
  blurb: string | null;
  primary_exposure: ExposureKind | null;
  included_in_indices: string[] | null;
  foreign_ownership_risk: string | null;
  last_reviewed_at: string | null;
  display_order: number;
  status: ReferenceStatus;
}

export interface CommodityEtf {
  id: number;
  sector_slug: string;
  ticker: string;
  name: string;
  issuer: string | null;
  mer_pct: number | null;
  underlying_exposure: string | null;
  domicile: string | null;
  distribution_frequency: string | null;
  blurb: string | null;
  display_order: number;
  status: ReferenceStatus;
}

export interface CommodityNewsBrief {
  id: number;
  sector_slug: string;
  article_slug: string;
  event_title: string;
  event_date: string;
  source_url: string | null;
  reviewed_by: string | null;
  compliance_flags: string[] | null;
  status: NewsBriefStatus;
  published_at: string | null;
}

// ─── Reads ─────────────────────────────────────────────────────

export async function getSector(slug: string): Promise<CommoditySector | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_sectors")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    return (data as CommoditySector | null) || null;
  } catch {
    return null;
  }
}

export async function listActiveSectors(): Promise<CommoditySector[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_sectors")
      .select("*")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .limit(100);
    return (data as CommoditySector[] | null) || [];
  } catch {
    return [];
  }
}

export async function listSectorStocks(
  sectorSlug: string,
): Promise<CommodityStock[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_stocks")
      .select("*")
      .eq("sector_slug", sectorSlug)
      .eq("status", "active")
      .order("display_order", { ascending: true });
    return (data as CommodityStock[] | null) || [];
  } catch {
    return [];
  }
}

export async function listSectorEtfs(
  sectorSlug: string,
): Promise<CommodityEtf[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_etfs")
      .select("*")
      .eq("sector_slug", sectorSlug)
      .eq("status", "active")
      .order("display_order", { ascending: true });
    return (data as CommodityEtf[] | null) || [];
  } catch {
    return [];
  }
}

export async function listSectorNewsBriefs(
  sectorSlug: string,
  limit = 10,
): Promise<CommodityNewsBrief[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_news_briefs")
      .select("*")
      .eq("sector_slug", sectorSlug)
      .eq("status", "published")
      .order("event_date", { ascending: false })
      .limit(limit);
    return (data as CommodityNewsBrief[] | null) || [];
  } catch {
    return [];
  }
}

// ─── Admin writes ──────────────────────────────────────────────

export interface UpsertSectorInput {
  slug: string;
  displayName: string;
  heroDescription: string;
  heroStats?: Record<string, string> | null;
  esgRiskRating?: EsgRiskRating;
  regulatorNotes?: string | null;
  displayOrder?: number;
  status?: SectorStatus;
}

export async function upsertSector(
  input: UpsertSectorInput,
): Promise<{ ok: boolean; error?: string; id?: number }> {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: "slug_invalid" };
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("commodity_sectors")
      .upsert(
        {
          slug,
          display_name: input.displayName.slice(0, 200),
          hero_description: input.heroDescription.slice(0, 2000),
          hero_stats: input.heroStats ?? null,
          esg_risk_rating: input.esgRiskRating || "medium",
          regulator_notes: input.regulatorNotes ?? null,
          display_order: input.displayOrder ?? 100,
          status: input.status || "active",
          launched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) {
      log.warn("commodity_sectors upsert failed", { error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id as number };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface UpsertStockInput {
  sectorSlug: string;
  ticker: string;
  companyName: string;
  marketCapBucket?: MarketCapBucket | null;
  primaryExposure?: ExposureKind | null;
  includedInIndices?: string[] | null;
  foreignOwnershipRisk?: string | null;
  blurb?: string | null;
  displayOrder?: number;
  status?: ReferenceStatus;
}

export async function upsertStock(
  input: UpsertStockInput,
): Promise<{ ok: boolean; error?: string }> {
  const ticker = input.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,6}$/.test(ticker)) {
    return { ok: false, error: "ticker_invalid" };
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("commodity_stocks").upsert(
      {
        sector_slug: input.sectorSlug,
        ticker,
        company_name: input.companyName.slice(0, 200),
        market_cap_bucket: input.marketCapBucket ?? null,
        primary_exposure: input.primaryExposure ?? null,
        included_in_indices: input.includedInIndices ?? null,
        foreign_ownership_risk: input.foreignOwnershipRisk ?? null,
        blurb: input.blurb ? input.blurb.slice(0, 500) : null,
        display_order: input.displayOrder ?? 100,
        status: input.status || "active",
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sector_slug,ticker" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface UpsertEtfInput {
  sectorSlug: string;
  ticker: string;
  name: string;
  issuer?: string | null;
  merPct?: number | null;
  underlyingExposure?: string | null;
  domicile?: string | null;
  distributionFrequency?: string | null;
  blurb?: string | null;
  displayOrder?: number;
}

export async function upsertEtf(
  input: UpsertEtfInput,
): Promise<{ ok: boolean; error?: string }> {
  const ticker = input.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,6}$/.test(ticker)) {
    return { ok: false, error: "ticker_invalid" };
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("commodity_etfs").upsert(
      {
        sector_slug: input.sectorSlug,
        ticker,
        name: input.name.slice(0, 200),
        issuer: input.issuer ?? null,
        mer_pct: input.merPct ?? null,
        underlying_exposure: input.underlyingExposure ?? null,
        domicile: input.domicile ?? null,
        distribution_frequency: input.distributionFrequency ?? null,
        blurb: input.blurb ? input.blurb.slice(0, 500) : null,
        display_order: input.displayOrder ?? 100,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sector_slug,ticker" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Price snapshot reads ────────────────────────────────────

export interface PriceSnapshot {
  ref: string;
  captured_at: string;
  price_minor_units: number;
  currency: string;
  source: string | null;
}

/**
 * Fetch the most recent price snapshot for each of the given refs
 * in one round trip. Results are keyed by ref for easy lookup on
 * the rendering side. Missing refs are simply absent from the map.
 */
export async function getLatestPriceSnapshots(
  refs: string[],
): Promise<Record<string, PriceSnapshot>> {
  if (refs.length === 0) return {};
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("commodity_price_snapshots")
      .select("entity_ref, captured_at, price_minor_units, currency, source")
      .in("entity_ref", refs)
      .order("captured_at", { ascending: false });
    const out: Record<string, PriceSnapshot> = {};
    for (const row of (data || []) as Array<{
      entity_ref: string;
      captured_at: string;
      price_minor_units: number;
      currency: string;
      source: string | null;
    }>) {
      if (out[row.entity_ref]) continue;
      out[row.entity_ref] = {
        ref: row.entity_ref,
        captured_at: row.captured_at,
        price_minor_units: row.price_minor_units,
        currency: row.currency,
        source: row.source,
      };
    }
    return out;
  } catch {
    return {};
  }
}
