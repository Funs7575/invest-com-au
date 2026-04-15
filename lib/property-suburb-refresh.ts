/**
 * Property suburb auto-refresh — pluggable provider pattern.
 *
 * Suburb investment stats (median prices, yields, vacancy, capital
 * growth) go stale. Without a provider we'd be serving the same
 * numbers for years. This library ingests fresh stats from whichever
 * paid data source is configured and writes a diff + audit row to
 * `property_suburb_refresh_log` so admins can see what changed.
 *
 * Providers:
 *
 *   - corelogic  via CORELOGIC_API_KEY
 *   - sqm        via SQM_RESEARCH_API_KEY
 *   - stub       no-op when neither is configured — logs an entry
 *                with empty fields_changed so the cron still runs
 *                and the dashboard shows it as healthy
 *
 * Operational design:
 *
 *   - Upsert-style: pulls the latest numbers for each suburb and
 *     writes changed fields back to `suburb_data`.
 *   - Diff is computed in-memory and stored as
 *     {field: [old, new]} JSON so admins can eyeball what changed.
 *   - Fields never dropped — if the provider returns null we keep
 *     the existing value (data loss is worse than staleness here).
 *   - Rate limiting: the cron batches 25 suburbs per run with a
 *     200ms pacer between calls. A fresh CoreLogic call is ~300ms.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("property-suburb-refresh");

export type SuburbProvider = "corelogic" | "sqm" | "stub";

export interface SuburbRefreshData {
  median_house_price: number | null;
  median_unit_price: number | null;
  rental_yield: number | null;
  vacancy_rate: number | null;
  capital_growth_10yr: number | null;
  sales_volume_12mo: number | null;
  median_rent_weekly: number | null;
}

export interface SuburbRefreshResult {
  suburbSlug: string;
  provider: SuburbProvider;
  fieldsChanged: Record<string, [unknown, unknown]>;
  error?: string;
}

/**
 * Fetch the latest stats for a single suburb and merge them into
 * `suburb_data`. Returns a diff object so the caller can log what
 * changed.
 *
 * Safe to call on a suburb with no provider configured — in that
 * case the function logs an empty refresh row and returns with
 * fieldsChanged: {}.
 */
export async function refreshSuburb(
  suburbSlug: string,
  state: string,
): Promise<SuburbRefreshResult> {
  const provider = selectProvider();

  let freshData: SuburbRefreshData | null = null;
  let error: string | undefined;

  try {
    if (provider === "corelogic") {
      freshData = await fetchFromCoreLogic(suburbSlug, state);
    } else if (provider === "sqm") {
      freshData = await fetchFromSqm(suburbSlug, state);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    log.warn("suburb refresh provider threw", { suburbSlug, provider, error });
  }

  // No provider / fetch failed — log an empty refresh row and return.
  if (!freshData) {
    await logRefresh(suburbSlug, provider, {}, error);
    return { suburbSlug, provider, fieldsChanged: {}, error };
  }

  // Load current row so we can compute diff.
  const supabase = createAdminClient();
  const { data: current, error: selectErr } = await supabase
    .from("suburb_data")
    .select(
      "median_house_price, median_unit_price, rental_yield, vacancy_rate, capital_growth_10yr, sales_volume_12mo, median_rent_weekly",
    )
    .eq("slug", suburbSlug)
    .maybeSingle();

  if (selectErr || !current) {
    const msg = selectErr?.message || "suburb row not found";
    await logRefresh(suburbSlug, provider, {}, msg);
    return { suburbSlug, provider, fieldsChanged: {}, error: msg };
  }

  // Diff + merge. Never overwrite with null (data loss avoidance).
  const fieldsChanged: Record<string, [unknown, unknown]> = {};
  const updates: Partial<SuburbRefreshData> = {};
  for (const key of Object.keys(freshData) as (keyof SuburbRefreshData)[]) {
    const newVal = freshData[key];
    const oldVal = (current as Record<string, unknown>)[key];
    if (newVal == null) continue;
    if (newVal !== oldVal) {
      fieldsChanged[key] = [oldVal, newVal];
      (updates as Record<string, unknown>)[key] = newVal;
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await supabase
      .from("suburb_data")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("slug", suburbSlug);
    if (updErr) {
      const msg = updErr.message;
      await logRefresh(suburbSlug, provider, {}, msg);
      return { suburbSlug, provider, fieldsChanged: {}, error: msg };
    }
  }

  await logRefresh(suburbSlug, provider, fieldsChanged);
  return { suburbSlug, provider, fieldsChanged };
}

function selectProvider(): SuburbProvider {
  if (process.env.CORELOGIC_API_KEY) return "corelogic";
  if (process.env.SQM_RESEARCH_API_KEY) return "sqm";
  return "stub";
}

// ─── CoreLogic adapter ────────────────────────────────────────────
/**
 * CoreLogic's API is behind a partner agreement so there's no public
 * JSON schema to link here. Operators with a contract get an endpoint
 * URL + bearer token. For v1 we call a generic endpoint and expect a
 * normalised JSON shape — operators bring their own proxy if the
 * endpoint shape differs.
 */
async function fetchFromCoreLogic(
  suburbSlug: string,
  state: string,
): Promise<SuburbRefreshData | null> {
  const url =
    process.env.CORELOGIC_API_URL ||
    "https://api.corelogic.com.au/v1/suburbs/stats";
  const token = process.env.CORELOGIC_API_KEY!;

  const res = await fetch(
    `${url}?slug=${encodeURIComponent(suburbSlug)}&state=${encodeURIComponent(state)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw new Error(`corelogic HTTP ${res.status}`);
  const body = (await res.json()) as {
    median_house?: number;
    median_unit?: number;
    rental_yield?: number;
    vacancy_rate?: number;
    capital_growth_10yr?: number;
    sales_volume_12mo?: number;
    median_rent_weekly?: number;
  };

  return {
    median_house_price: normNumber(body.median_house),
    median_unit_price: normNumber(body.median_unit),
    rental_yield: normNumber(body.rental_yield),
    vacancy_rate: normNumber(body.vacancy_rate),
    capital_growth_10yr: normNumber(body.capital_growth_10yr),
    sales_volume_12mo: normNumber(body.sales_volume_12mo),
    median_rent_weekly: normNumber(body.median_rent_weekly),
  };
}

// ─── SQM Research adapter ─────────────────────────────────────────
async function fetchFromSqm(
  suburbSlug: string,
  state: string,
): Promise<SuburbRefreshData | null> {
  const url =
    process.env.SQM_RESEARCH_API_URL ||
    "https://sqmresearch.com.au/api/v1/suburb";
  const token = process.env.SQM_RESEARCH_API_KEY!;

  const res = await fetch(
    `${url}?postcode_slug=${encodeURIComponent(suburbSlug)}&state=${encodeURIComponent(state)}`,
    {
      headers: { "X-API-Key": token },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw new Error(`sqm HTTP ${res.status}`);
  const body = (await res.json()) as {
    weekly_rent?: number;
    yield?: number;
    vacancy?: number;
    median_house?: number;
    median_unit?: number;
    growth_10yr?: number;
    volume?: number;
  };

  return {
    median_house_price: normNumber(body.median_house),
    median_unit_price: normNumber(body.median_unit),
    rental_yield: normNumber(body.yield),
    vacancy_rate: normNumber(body.vacancy),
    capital_growth_10yr: normNumber(body.growth_10yr),
    sales_volume_12mo: normNumber(body.volume),
    median_rent_weekly: normNumber(body.weekly_rent),
  };
}

function normNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function logRefresh(
  suburbSlug: string,
  provider: SuburbProvider,
  fieldsChanged: Record<string, [unknown, unknown]>,
  error?: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("property_suburb_refresh_log").insert({
      suburb_slug: suburbSlug,
      provider,
      fields_changed: error ? { ...fieldsChanged, __error: error } : fieldsChanged,
    });
  } catch (err) {
    log.warn("property_suburb_refresh_log insert failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
