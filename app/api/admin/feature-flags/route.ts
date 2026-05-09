import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:feature-flags");

export const runtime = "nodejs";

/**
 * /api/admin/feature-flags
 *
 *   GET   — list every flag row
 *   PATCH — { flag_key, enabled?, rollout_pct?, allowlist?,
 *              denylist?, segments?, description?, archive? }
 *           Partial update of a single flag row.
 *           archive:true sets archived_at; archive:false clears it.
 *
 * Flag rows are seeded via migration and hand-edited here.
 * We don't expose DELETE — a removed flag should be disabled
 * or its rollout dropped to 0, not deleted, so audit history
 * in the app code stays meaningful.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("flag_key", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const flagKey = typeof body.flag_key === "string" ? body.flag_key : null;
  if (!flagKey) {
    return NextResponse.json({ error: "Missing flag_key" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (
    typeof body.rollout_pct === "number" &&
    body.rollout_pct >= 0 &&
    body.rollout_pct <= 100
  ) {
    update.rollout_pct = body.rollout_pct;
  }
  if (Array.isArray(body.allowlist)) update.allowlist = body.allowlist;
  if (Array.isArray(body.denylist)) update.denylist = body.denylist;
  if (Array.isArray(body.segments)) update.segments = body.segments;
  if (typeof body.description === "string")
    update.description = body.description.slice(0, 500);
  if (body.archive === true) update.archived_at = new Date().toISOString();
  if (body.archive === false) update.archived_at = null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("feature_flags")
    .update(update)
    .eq("flag_key", flagKey);
  if (error) {
    log.warn("feature_flags update failed", { error: error.message, flagKey });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // build a Json-safe copy (update is Record<string,unknown>; values here are bool|number|string|string[])
  const auditChanges: Record<string, boolean | number | string | string[]> = {};
  if (typeof update.enabled === "boolean") auditChanges.enabled = update.enabled;
  if (typeof update.rollout_pct === "number") auditChanges.rollout_pct = update.rollout_pct;
  if (Array.isArray(update.allowlist)) auditChanges.allowlist = update.allowlist as string[];
  if (Array.isArray(update.denylist)) auditChanges.denylist = update.denylist as string[];
  if (Array.isArray(update.segments)) auditChanges.segments = update.segments as string[];
  if (typeof update.description === "string") auditChanges.description = update.description;
  if (typeof update.archived_at === "string") auditChanges.archived_at = update.archived_at;
  if (update.archived_at === null) auditChanges.archived_at = "";
  await supabase.from("admin_audit_log").insert({
    action: "feature_flag:updated",
    entity_type: "feature_flag",
    entity_id: flagKey,
    entity_name: flagKey,
    admin_email: guard.email,
    details: auditChanges,
  });
  return NextResponse.json({ ok: true });
}
