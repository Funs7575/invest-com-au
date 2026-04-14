import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { invalidateFlagCache } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

const log = logger("admin:automation:flags");

/**
 * Feature flag CRUD.
 *
 *   GET    — list every flag with its current state
 *   POST   — create or upsert a flag
 *   PATCH  — partial update by flag_key (enabled, rollout_pct,
 *            allowlist, denylist, segments)
 *
 * Every mutation:
 *   - stamps updated_by + updated_at on the row
 *   - invalidates the in-process evaluator cache so the change
 *     is visible within 30s across all workers
 *   - logs an admin_action_log row for the audit trail
 */

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feature_flags")
    .select("*")
    .order("flag_key");
  if (error) {
    log.error("feature_flags fetch failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data || [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const flagKey = typeof body.flag_key === "string" ? body.flag_key : null;
  if (!flagKey) {
    return NextResponse.json({ error: "Missing flag_key" }, { status: 400 });
  }

  const admin = createAdminClient();
  const payload = {
    flag_key: flagKey,
    description: typeof body.description === "string" ? body.description : null,
    enabled: typeof body.enabled === "boolean" ? body.enabled : false,
    rollout_pct: clampPct(body.rollout_pct),
    allowlist: Array.isArray(body.allowlist)
      ? body.allowlist.filter((s: unknown): s is string => typeof s === "string")
      : [],
    denylist: Array.isArray(body.denylist)
      ? body.denylist.filter((s: unknown): s is string => typeof s === "string")
      : [],
    segments: Array.isArray(body.segments)
      ? body.segments.filter((s: unknown): s is string => typeof s === "string")
      : [],
    updated_by: guard.email,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("feature_flags")
    .upsert(payload, { onConflict: "flag_key" });
  if (error) {
    log.error("feature_flags upsert failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateFlagCache(flagKey);
  await admin.from("admin_action_log").insert({
    admin_email: guard.email,
    feature: `flag:${flagKey}`,
    action: "config",
    reason: typeof body.reason === "string" ? body.reason : null,
    context: payload as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const flagKey = typeof body.flag_key === "string" ? body.flag_key : null;
  if (!flagKey) {
    return NextResponse.json({ error: "Missing flag_key" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_by: guard.email,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.rollout_pct != null) patch.rollout_pct = clampPct(body.rollout_pct);
  if (Array.isArray(body.allowlist)) patch.allowlist = body.allowlist;
  if (Array.isArray(body.denylist)) patch.denylist = body.denylist;
  if (Array.isArray(body.segments)) patch.segments = body.segments;

  const admin = createAdminClient();
  const { error } = await admin
    .from("feature_flags")
    .update(patch)
    .eq("flag_key", flagKey);
  if (error) {
    log.error("feature_flags patch failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateFlagCache(flagKey);
  await admin.from("admin_action_log").insert({
    admin_email: guard.email,
    feature: `flag:${flagKey}`,
    action: "config",
    reason: typeof body.reason === "string" ? body.reason : null,
    context: patch,
  });

  return NextResponse.json({ ok: true });
}

function clampPct(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
