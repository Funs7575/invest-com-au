/**
 * /api/etf-overlap
 *
 * GET ?a=vas&b=ndq — compute constituent overlap between two ETFs.
 *
 * General information only — not personal financial advice.
 * Rate-limits: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { computeOverlap, type EtfHolding } from "@/lib/etf-overlap";

export const runtime = "nodejs";
// Use ISR-style caching at edge: ETF holdings change infrequently.
export const revalidate = 3600;

const log = logger("api:etf-overlap");

export async function GET(req: NextRequest) {
  if (!(await isAllowed("etf_overlap_get", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const a = (searchParams.get("a") ?? "").toLowerCase().trim();
  const b = (searchParams.get("b") ?? "").toLowerCase().trim();

  if (!a || !b) {
    return NextResponse.json({ error: "Query params 'a' and 'b' (ETF slugs) are required." }, { status: 400 });
  }
  if (a === b) {
    return NextResponse.json({ error: "The two ETFs must be different." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch holdings for both ETFs in parallel.
  const [resA, resB] = await Promise.all([
    supabase
      .from("etf_holdings")
      .select("ticker, security_name, weight_bps, etf_name")
      .eq("etf_slug", a)
      .order("weight_bps", { ascending: false }),
    supabase
      .from("etf_holdings")
      .select("ticker, security_name, weight_bps, etf_name")
      .eq("etf_slug", b)
      .order("weight_bps", { ascending: false }),
  ]);

  if (resA.error || resB.error) {
    log.warn("etf-overlap fetch failed", { a, b, errA: resA.error?.message, errB: resB.error?.message });
    return NextResponse.json({ error: "Could not fetch ETF holdings." }, { status: 500 });
  }

  if (!resA.data?.length) {
    return NextResponse.json({ error: `No holdings data found for ETF: ${a.toUpperCase()}` }, { status: 404 });
  }
  if (!resB.data?.length) {
    return NextResponse.json({ error: `No holdings data found for ETF: ${b.toUpperCase()}` }, { status: 404 });
  }

  const holdingsA: EtfHolding[] = resA.data.map((r) => ({
    ticker: r.ticker as string,
    securityName: r.security_name as string,
    weightBps: r.weight_bps as number,
  }));
  const holdingsB: EtfHolding[] = resB.data.map((r) => ({
    ticker: r.ticker as string,
    securityName: r.security_name as string,
    weightBps: r.weight_bps as number,
  }));

  const etfNameA = (resA.data[0]?.etf_name as string | undefined) ?? a.toUpperCase();
  const etfNameB = (resB.data[0]?.etf_name as string | undefined) ?? b.toUpperCase();

  const result = computeOverlap(holdingsA, holdingsB);

  return NextResponse.json({
    etfA: { slug: a, name: etfNameA, holdingsSeeded: holdingsA.length },
    etfB: { slug: b, name: etfNameB, holdingsSeeded: holdingsB.length },
    ...result,
    disclaimer: "Holdings data covers the top constituents from publicly published fund disclosures. General information only — not personal financial advice.",
  });
}
