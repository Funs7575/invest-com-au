/**
 * POST /api/admin/foreign-investment/seed
 *
 * One-time seeding route — populates all fi_* tables from the TypeScript
 * static data files. Safe to run multiple times (INSERT … ON CONFLICT DO
 * NOTHING). Use this after running the SQL migration if you prefer
 * code-driven seeding over the SQL INSERT statements.
 *
 * Also used to "reset to defaults" if DB data gets corrupted.
 *
 * Body: { adminEmail: string; resetFirst?: boolean }
 *   resetFirst: if true, TRUNCATES all fi_* data tables before seeding
 *               (use with caution — adds a second confirm in the admin UI)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { getAdminEmails } from "@/lib/admin";
import {
  NON_RESIDENT_TAX_BRACKETS,
  RESIDENT_TAX_BRACKETS,
  DTA_COUNTRIES,
  DASP_WITHHOLDING_RATES,
} from "@/lib/foreign-investment-data";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (token !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { adminEmail: string; resetFirst?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { adminEmail, resetFirst = false } = body;

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes((adminEmail ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Not an admin email" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const results: Record<string, string> = {};

  // ── Optional reset ────────────────────────────────────────
  if (resetFirst) {
    await supabase.from("fi_tax_brackets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("fi_dta_countries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("fi_dasp_rates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    results.reset = "all fi_* data tables truncated";
  }

  // ── Tax brackets ──────────────────────────────────────────
  const nonResRows = NON_RESIDENT_TAX_BRACKETS.map((b, i) => ({
    tax_year: "2025-26",
    taxpayer_type: "non_resident" as const,
    income_from: b.from,
    income_to: b.to,
    rate: b.rate,
    description: b.description,
    sort_order: i + 1,
  }));

  const resRows = RESIDENT_TAX_BRACKETS.map((b, i) => ({
    tax_year: "2025-26",
    taxpayer_type: "resident" as const,
    income_from: b.from,
    income_to: b.to,
    rate: b.rate,
    description: b.description,
    sort_order: i + 1,
  }));

  const { error: taxErr } = await supabase
    .from("fi_tax_brackets")
    .upsert([...nonResRows, ...resRows], { onConflict: "tax_year,taxpayer_type,income_from" });
  results.fi_tax_brackets = taxErr ? `ERROR: ${taxErr.message}` : `${nonResRows.length + resRows.length} rows seeded`;

  // ── DTA countries ─────────────────────────────────────────
  const dtaRows = DTA_COUNTRIES.map((c, i) => ({
    country: c.country,
    country_code: c.countryCode,
    has_dta: c.hasDTA,
    dividend_wht: c.dividendWHT,
    interest_wht: c.interestWHT,
    royalties_wht: c.royaltiesWHT,
    dta_effective_year: c.dtaEffectiveYear ?? null,
    notes: c.notes ?? null,
    sort_order: i + 1,
  }));

  const { error: dtaErr } = await supabase
    .from("fi_dta_countries")
    .upsert(dtaRows, { onConflict: "country_code" });
  results.fi_dta_countries = dtaErr ? `ERROR: ${dtaErr.message}` : `${dtaRows.length} rows seeded`;

  // ── DASP rates ────────────────────────────────────────────
  const standardRates = DASP_WITHHOLDING_RATES.map((r, i) => ({
    component_type: r.componentType,
    visa_category: "standard" as const,
    withholding_rate: r.withholdingRate,
    notes: r.notes,
    sort_order: i + 1,
  }));
  // WHM row
  const whmRow = {
    component_type: "All components — Working Holiday Maker",
    visa_category: "whm" as const,
    withholding_rate: 65,
    notes: "WHM visa holders (subclass 417 and 462) pay 65% across ALL super components regardless of element type.",
    sort_order: 4,
  };

  const { error: daspErr } = await supabase
    .from("fi_dasp_rates")
    .upsert([...standardRates, whmRow], { onConflict: "component_type,visa_category" });
  results.fi_dasp_rates = daspErr ? `ERROR: ${daspErr.message}` : `${standardRates.length + 1} rows seeded`;

  // ── Audit log ─────────────────────────────────────────────
  await supabase.from("fi_change_log").insert({
    category_key: "all",
    action: "seed",
    changed_by: adminEmail,
    note: `Seed from TypeScript static defaults${resetFirst ? " (reset first)" : ""}`,
  });

  // ── Bust cache ────────────────────────────────────────────
  revalidateTag("fi-data", {});

  return NextResponse.json({ ok: true, results });
}
