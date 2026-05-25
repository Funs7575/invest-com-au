/**
 * Admin CRUD for `investment_loan_rates`.
 *
 * Auth:   ADMIN_EMAILS allow-list via requireAdmin().
 * Writes: createAdminClient() (service-role) — table has deny-all anon/auth
 *         write policies; service_role is the only path for mutations.
 * Audit:  Every mutating operation appends a row to admin_audit_log.
 *         On upsert, if rate_pct changes materially (≥0.01 pp) the old and new
 *         values are recorded in the details payload for change-tracking.
 *
 * Endpoints:
 *   GET    — list all rows ordered by rate_pct asc
 *   POST   — upsert by lender_slug; records old rate_pct when it changes
 *   DELETE — remove by uuid; id passed as ?id=<uuid>
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("admin-loan-rates");

// ── Zod schemas ────────────────────────────────────────────────────────────────

const UpsertSchema = z.object({
  // id is optional — omit for new rows, include to pin a specific uuid
  id: z.string().uuid().optional(),
  lender_name: z.string().min(1).max(200),
  lender_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, {
    message: "lender_slug must be lowercase letters, numbers, and hyphens only",
  }),
  rate_pct: z.number().min(0).max(99),
  comparison_rate_pct: z.number().min(0).max(99),
  max_lvr: z.number().int().min(1).max(100),
  interest_only: z.boolean(),
  offset_available: z.boolean(),
  // cents — e.g. 5_000_000_00 = $5,000,000
  min_loan_cents: z.number().int().min(0),
  apply_url: z.string().min(1).max(500),
});

export type UpsertBody = z.infer<typeof UpsertSchema>;

// ── GET ────────────────────────────────────────────────────────────────────────

/** GET /api/admin/loan-rates — list all rows */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investment_loan_rates")
    .select("*")
    .order("rate_pct", { ascending: true });

  if (error) {
    log.error("List failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}

// ── POST (upsert) ──────────────────────────────────────────────────────────────

/**
 * POST /api/admin/loan-rates
 *
 * Upserts a row keyed on lender_slug. If rate_pct changes materially
 * (≥ 0.01 percentage point), the old and new values are captured in the
 * audit log details for editorial change-tracking.
 */
export const POST = withValidatedBody(UpsertSchema, async (_req, body) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();

  // Fetch the existing row (if any) to detect a material rate change.
  const { data: existing } = await supabase
    .from("investment_loan_rates")
    .select("id, rate_pct")
    .eq("lender_slug", body.lender_slug)
    .maybeSingle();

  const now = new Date().toISOString();
  const { data: upserted, error } = await supabase
    .from("investment_loan_rates")
    .upsert(
      { ...body, updated_at: now },
      { onConflict: "lender_slug", ignoreDuplicates: false },
    )
    .select("*")
    .single();

  if (error) {
    log.error("Upsert failed", { error: error.message, lender_slug: body.lender_slug });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build audit details — include rate change context when material.
  const prevRate = existing?.rate_pct as number | null | undefined;
  const rateChanged =
    prevRate !== undefined &&
    prevRate !== null &&
    Math.abs(body.rate_pct - prevRate) >= 0.01;

  const auditDetails: Record<string, unknown> = {
    lender_name: body.lender_name,
    lender_slug: body.lender_slug,
    rate_pct: body.rate_pct,
    ...(rateChanged && {
      rate_pct_old: prevRate,
      rate_pct_new: body.rate_pct,
      rate_pct_delta: +(body.rate_pct - prevRate!).toFixed(4),
    }),
  };

  const isCreate = !existing;
  await supabase.from("admin_audit_log").insert({
    action: isCreate ? "loan_rate:created" : "loan_rate:updated",
    entity_type: "investment_loan_rates",
    entity_id: upserted.id as string,
    entity_name: body.lender_name,
    admin_email: guard.email,
    details: auditDetails,
  });

  return NextResponse.json(upserted, { status: isCreate ? 201 : 200 });
});

// ── DELETE ─────────────────────────────────────────────────────────────────────

/** DELETE /api/admin/loan-rates?id=<uuid> */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "id (uuid) required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Capture the row name before deletion for the audit entry.
  const { data: row } = await supabase
    .from("investment_loan_rates")
    .select("lender_name, lender_slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("investment_loan_rates")
    .delete()
    .eq("id", id);

  if (error) {
    log.error("Delete failed", { error: error.message, id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "loan_rate:deleted",
    entity_type: "investment_loan_rates",
    entity_id: id,
    entity_name: (row?.lender_name as string | undefined) ?? id,
    admin_email: guard.email,
    details: row
      ? { lender_slug: row.lender_slug as string }
      : null,
  });

  return NextResponse.json({ ok: true });
}
