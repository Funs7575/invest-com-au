import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey, bucketPreset } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("admin:marketplace-ranking");

export const runtime = "nodejs";

/**
 * /api/admin/marketplace-ranking
 *
 *   GET   — list every weight row for both surfaces.
 *   POST  — upsert a batch of weights for one surface.
 *
 * Body shape (POST):
 *   {
 *     surface: "advisors" | "teams",
 *     weights: Array<{
 *       signal: string,
 *       weight_bps: number,
 *       enabled: boolean,
 *       notes?: string | null,
 *     }>,
 *   }
 *
 * Upserts run keyed on the `(surface, signal)` unique index defined in
 * supabase/migrations/20260515_mm25_marketplace_ranking.sql. A non-admin
 * caller is refused at the guard; rate limit is per-IP defence-in-depth
 * so a compromised admin session can't be used to thrash the table.
 */

const SignalEnum = z.enum([
  "verified",
  "outcome_score",
  "response_latency_inv",
  "subscription_tier",
  "credit_headroom",
  "rating",
]);

const SurfaceEnum = z.enum(["advisors", "teams"]);

const WeightRowSchema = z.object({
  signal: SignalEnum,
  weight_bps: z.number().int().min(0).max(100_000),
  enabled: z.boolean(),
  notes: z.string().max(500).nullable().optional(),
});

const PostBodySchema = z.object({
  surface: SurfaceEnum,
  weights: z.array(WeightRowSchema).min(1).max(20),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("marketplace_ranking_weights")
    .select("id, surface, signal, weight_bps, enabled, notes, updated_at")
    .order("surface", { ascending: true })
    .order("signal", { ascending: true });
  if (error) {
    log.error("list failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // Per-IP throttle — defence in depth on top of the admin gate.
  const allowed = await isAllowed(
    "admin-marketplace-ranking",
    ipKey(request),
    bucketPreset("perMinute"),
  );
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await request.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.join(".") ?? "";
    const message = first?.message ?? "Invalid request body";
    return NextResponse.json(
      {
        error: path ? `${path}: ${message}` : message,
        code: "validation_error",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }
  const { surface, weights } = parsed.data;

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const rows = weights.map((w) => ({
    surface,
    signal: w.signal,
    weight_bps: w.weight_bps,
    enabled: w.enabled,
    notes: w.notes ?? null,
    updated_at: nowIso,
  }));

  const { error } = await supabase
    .from("marketplace_ranking_weights")
    .upsert(rows, { onConflict: "surface,signal" });

  if (error) {
    log.error("upsert failed", { surface, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "marketplace_ranking:updated",
    entity_type: "marketplace_ranking_weights",
    entity_id: surface,
    entity_name: surface,
    admin_email: guard.email,
    details: {
      surface,
      count: weights.length,
      signals: weights.map((w) => w.signal),
    },
  });

  return NextResponse.json({ ok: true, count: weights.length });
}
