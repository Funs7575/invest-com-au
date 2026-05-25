/**
 * /api/admin/ab-tests — admin-only list / create / update for site A/B tests.
 *
 *   GET   — list every test, newest-first.
 *   POST  — create a draft test
 *           { name, test_type, page, variant_a, variant_b, traffic_split }
 *   PATCH — update one test by id
 *           { id, status?, winner?, start_date?, end_date?, updated_at? }
 *
 * The admin A/B test page previously wrote site_ab_tests via the public anon
 * browser client. The 20260521_buildfix_rls_overopen.sql migration tightens
 * site_ab_tests to anon-SELECT (running rows only) + service_role ALL, so
 * those writes are now denied at the database. This route moves them to the
 * proven service-role pattern behind the standard ADMIN_EMAILS guard.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:ab-tests");

export const runtime = "nodejs";

const VariantSchema = z.record(z.string(), z.string());

const CreateBody = z.object({
  name: z.string().min(1),
  test_type: z.string().min(1),
  page: z.string().min(1),
  variant_a: VariantSchema,
  variant_b: VariantSchema,
  traffic_split: z.number(),
});

// Mirror the exact set of fields the page mutates: updateStatus() sends
// status + updated_at (+ optional start_date / end_date) and declareWinner()
// sends winner + status + end_date + updated_at. The client builds the update
// object today; the route validates the allowed keys and applies them.
const PatchBody = z.object({
  id: z.number().int().positive(),
  status: z.string().optional(),
  winner: z.enum(["a", "b"]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  updated_at: z.string().optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_ab_tests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    log.error("ab-tests list failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tests: data || [] });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const raw = await req.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }
  const { name, test_type, page, variant_a, variant_b, traffic_split } =
    parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_ab_tests").insert({
    name: name.trim(),
    test_type,
    page,
    variant_a,
    variant_b,
    traffic_split,
    status: "draft",
  });

  if (error) {
    log.error("ab-test create failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const raw = await req.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }
  const { id, ...fields } = parsed.data;

  const update: Record<string, unknown> = {};
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.winner !== undefined) update.winner = fields.winner;
  if (fields.start_date !== undefined) update.start_date = fields.start_date;
  if (fields.end_date !== undefined) update.end_date = fields.end_date;
  if (fields.updated_at !== undefined) update.updated_at = fields.updated_at;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_ab_tests")
    .update(update)
    .eq("id", id);

  if (error) {
    log.error("ab-test update failed", { id, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
