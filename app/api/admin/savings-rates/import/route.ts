import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("admin:savings-rates:import");

// FIN_NOTEBOOK Revenue #4 (rate alerts) import endpoint. Lets an admin
// POST a batch of rate snapshots — typically pasted from a CSV. The
// rate-alerts cron consumes these snapshots, so without this endpoint
// the cron is a no-op heartbeat.
//
// Why batch + manual: there is no live rate-data feed today and we
// don't yet have the BD or legal sign-off to scrape competitor sites.
// Manual paste-import keeps the loop closed end-to-end so the rate-
// alerts product can ship to users while the upstream data sourcing is
// negotiated separately.

const RowSchema = z.object({
  broker_id: z.number().int().positive(),
  product_kind: z.enum(["savings_account", "term_deposit"]),
  // Rate as percent (5.25). Persisted as bps to dodge float pain.
  rate_pct: z.number().min(0).max(50),
  intro_rate_pct: z.number().min(0).max(50).nullable().optional(),
  intro_term_months: z.number().int().positive().max(60).nullable().optional(),
  min_balance: z.number().int().nonnegative().nullable().optional(),
  max_balance: z.number().int().nonnegative().nullable().optional(),
  term_months: z.number().int().positive().max(120).nullable().optional(),
  source: z.enum(["manual", "scraped", "partner_feed"]).default("manual"),
  notes: z.string().max(2000).default(""),
});

const RequestSchema = z.object({
  rows: z.array(RowSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { rows } = parsed.data;

  // Pre-validate intro consistency (matches the DB CHECK constraint).
  // Catch + 400 here rather than letting the DB throw, so admins see
  // a single error response listing every offending row.
  const consistencyErrors: { index: number; reason: string }[] = [];
  for (const [i, row] of rows.entries()) {
    const introBoth = row.intro_rate_pct != null && row.intro_term_months != null;
    const introNeither = row.intro_rate_pct == null && row.intro_term_months == null;
    if (!introBoth && !introNeither) {
      consistencyErrors.push({
        index: i,
        reason: "intro_rate_pct and intro_term_months must both be set or both null",
      });
    }
    if (row.max_balance != null && row.min_balance != null && row.max_balance <= row.min_balance) {
      consistencyErrors.push({
        index: i,
        reason: "max_balance must be greater than min_balance",
      });
    }
  }
  if (consistencyErrors.length > 0) {
    return NextResponse.json(
      { error: "Row validation failed", details: consistencyErrors },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const inserts = rows.map((row) => ({
    broker_id: row.broker_id,
    product_kind: row.product_kind,
    rate_bps: Math.round(row.rate_pct * 100),
    intro_rate_bps: row.intro_rate_pct != null ? Math.round(row.intro_rate_pct * 100) : null,
    intro_term_months: row.intro_term_months ?? null,
    min_balance_cents: row.min_balance != null ? row.min_balance * 100 : 0,
    max_balance_cents: row.max_balance != null ? row.max_balance * 100 : null,
    term_months: row.term_months ?? null,
    source: row.source,
    notes: row.notes,
  }));

  const { error } = await supabase
    .from("savings_rate_snapshots")
    .insert(inserts);

  if (error) {
    log.error("import insert failed", { err: error.message, count: inserts.length });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.info("savings rates imported", {
    by: guard.email,
    count: inserts.length,
    source: inserts[0]?.source,
  });

  return NextResponse.json({ success: true, imported: inserts.length });
}
