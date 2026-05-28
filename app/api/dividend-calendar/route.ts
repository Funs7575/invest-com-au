/**
 * /api/dividend-calendar
 *
 * GET — upcoming ETF distribution events.
 *
 * ?months=N  — look-ahead window (default 3, max 12)
 * ?etf=slug  — filter to specific ETF (optional)
 *
 * General information only.
 * Rate-limits: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const revalidate = 3600;

const log = logger("api:dividend-calendar");

export async function GET(req: NextRequest) {
  if (!(await isAllowed("dividend_calendar_get", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const monthsRaw = parseInt(searchParams.get("months") ?? "3", 10);
  const months = Math.max(1, Math.min(12, isNaN(monthsRaw) ? 3 : monthsRaw));
  const etfFilter = (searchParams.get("etf") ?? "").toLowerCase().trim() || null;

  const supabase = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + months * 30.5 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  let query = supabase
    .from("etf_distributions")
    .select("etf_slug, etf_name, ex_date, pay_date, amount_cents, franking_pct, distribution_type")
    .gte("ex_date", today)
    .lte("ex_date", until)
    .order("ex_date", { ascending: true });

  if (etfFilter) {
    query = query.eq("etf_slug", etfFilter);
  }

  const { data, error } = await query;

  if (error) {
    log.warn("dividend-calendar fetch failed", { error: error.message });
    return NextResponse.json({ error: "Could not fetch distribution calendar." }, { status: 500 });
  }

  const distributions = (data ?? []).map((r) => ({
    etfSlug: r.etf_slug as string,
    etfName: r.etf_name as string,
    exDate: r.ex_date as string,
    payDate: (r.pay_date as string | null) ?? null,
    amountCents: (r.amount_cents as number | null) ?? null,
    frankingPct: r.franking_pct as number,
    distributionType: r.distribution_type as string,
  }));

  // Expose the full list of known ETF slugs as a convenience for the UI.
  const { data: knownEtfs } = await supabase
    .from("etf_distributions")
    .select("etf_slug, etf_name")
    .order("etf_slug");

  const uniqueEtfs = Array.from(
    new Map((knownEtfs ?? []).map((r) => [r.etf_slug as string, r.etf_name as string])).entries(),
  ).map(([slug, name]) => ({ slug, name }));

  return NextResponse.json({
    distributions,
    knownEtfs: uniqueEtfs,
    windowMonths: months,
    disclaimer: "Distribution amounts are estimates based on prior payments and may differ from actual amounts. General information only — not personal financial advice.",
  });
}
