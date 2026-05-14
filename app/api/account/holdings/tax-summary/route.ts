import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  formatHoldingsAsTaxSummaryCsv,
  getAustralianTaxYearBoundsForYear,
  getCurrentAustralianTaxYear,
  type TaxSummaryHolding,
} from "@/lib/holdings/tax-summary";

const log = logger("api:account:tax-summary");

export const runtime = "nodejs";

/**
 * GET /api/account/holdings/tax-summary?tax_year=YYYY
 *
 * Streams a CSV of the investor's holdings as of a given Australian tax
 * year (defaults to current FY). Cost basis only — no current prices —
 * because the snapshot must be tax-stable. RLS scopes rows to the calling
 * user; we still pass `auth_user_id` in the where clause for defence in
 * depth.
 *
 * Filter rule: include holdings *acquired on or before* the tax-year end
 * (30 Jun YYYY). A position acquired during or before the FY was held at
 * some point during it; deciding whether it was *still held* on balance
 * date needs the (out-of-scope) transactions table, so we err on the
 * side of inclusion and let the accountant trim.
 *
 * No body, so no `withValidatedBody`; query params are parsed via Zod
 * directly per CLAUDE.md's validation guidance.
 */

const QuerySchema = z.object({
  tax_year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export async function GET(req: NextRequest): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = QuerySchema.safeParse({
    tax_year: req.nextUrl.searchParams.get("tax_year") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", detail: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const taxYear = parsed.data.tax_year ?? getCurrentAustralianTaxYear();
  const bounds = getAustralianTaxYearBoundsForYear(taxYear);

  const { data, error } = await supabase
    .from("investor_holdings")
    .select(
      "ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug, notes",
    )
    .lte("acquired_at", bounds.end)
    .order("acquired_at", { ascending: false });

  if (error) {
    log.warn("tax summary fetch failed", {
      error: error.message,
      tax_year: taxYear,
    });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const holdings: TaxSummaryHolding[] = (data ?? []).map((r) => ({
    ticker: String(r.ticker),
    exchange: String(r.exchange),
    shares: Number(r.shares),
    cost_basis_per_share_cents: Number(r.cost_basis_per_share_cents),
    acquired_at: String(r.acquired_at),
    broker_slug: r.broker_slug == null ? null : String(r.broker_slug),
    notes: r.notes == null ? null : String(r.notes),
  }));

  const csv = formatHoldingsAsTaxSummaryCsv(holdings, taxYear);
  const filename = `invest-com-au-tax-summary-${taxYear}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Discourage caching — content is user-specific and tax-sensitive.
      "Cache-Control": "private, no-store",
    },
  });
}
