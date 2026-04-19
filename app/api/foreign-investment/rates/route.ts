import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("foreign-investment-rates");

export const runtime = "nodejs";

/**
 * GET /api/foreign-investment/rates?country=XX
 *
 * Returns the active withholding-tax rates for a given country code
 * plus the other active foreign-investment rate rows (FIRB thresholds,
 * fees, etc.) for that country. Country code is the ISO-3166 alpha-2
 * the table uses (GB, HK, SG, JP, etc.).
 *
 * When no country is supplied, returns the full distinct country
 * list for populating a UI dropdown.
 */

interface RateRow {
  id: number;
  rate_type: string;
  country_code: string | null;
  country_name: string | null;
  state: string | null;
  category: string | null;
  rate_percent: number | string | null;
  threshold_cents: number | null;
  fee_cents: number | null;
  notes: string | null;
  effective_from: string | null;
}

export async function GET(req: NextRequest) {
  if (!(await isAllowed("fi_rates_get", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const country = req.nextUrl.searchParams.get("country");

  try {
    const supabase = createAdminClient();

    if (!country) {
      // Return the distinct country list for the dropdown.
      const { data, error } = await supabase
        .from("foreign_investment_rates")
        .select("country_code, country_name")
        .eq("active", true)
        .not("country_code", "is", null);
      if (error) {
        log.error("countries_fetch_failed", { error: error.message });
        return NextResponse.json(
          { ok: false, error: "Database error" },
          { status: 500 },
        );
      }
      const seen = new Set<string>();
      const countries: Array<{ code: string; name: string }> = [];
      for (const row of (data || []) as Array<{
        country_code: string;
        country_name: string | null;
      }>) {
        if (!row.country_code || seen.has(row.country_code)) continue;
        seen.add(row.country_code);
        countries.push({
          code: row.country_code,
          name: row.country_name ?? row.country_code,
        });
      }
      countries.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ ok: true, countries });
    }

    const code = country.toUpperCase().slice(0, 3);
    const { data, error } = await supabase
      .from("foreign_investment_rates")
      .select(
        "id, rate_type, country_code, country_name, state, category, rate_percent, threshold_cents, fee_cents, notes, effective_from",
      )
      .eq("active", true)
      .eq("country_code", code)
      .order("rate_type", { ascending: true });
    if (error) {
      log.error("country_fetch_failed", {
        country: code,
        error: error.message,
      });
      return NextResponse.json(
        { ok: false, error: "Database error" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      country: code,
      rates: (data || []) as RateRow[],
    });
  } catch (err) {
    log.error("unexpected_error", { err: String(err) });
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
