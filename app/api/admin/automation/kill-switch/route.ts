import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { invalidateKillSwitchCache } from "@/lib/admin/classifier-config";

const log = logger("admin:automation:kill-switch");

/**
 * GET  — list every kill switch row (feature, disabled, reason, etc)
 * POST — flip a feature on/off. Body: { feature, disabled, reason? }
 *
 *   feature='global' disables ALL automation features at once.
 *   Per-feature rows (from AUTOMATION_FEATURES) disable a single
 *   classifier/cron. Every classifier entry point calls
 *   isFeatureDisabled() before running.
 *
 * After a write we invalidate the cache so the toggle takes effect
 * on the next classifier call.
 */

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getAdminEmails().includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automation_kill_switches")
    .select("feature, disabled, reason, disabled_by, disabled_at")
    .order("feature");

  if (error) {
    log.error("kill switch fetch failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getAdminEmails().includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const feature: string | null = typeof body.feature === "string" ? body.feature : null;
  const disabled: boolean =
    typeof body.disabled === "boolean" ? body.disabled : false;
  const reason: string | null = typeof body.reason === "string" ? body.reason : null;

  if (!feature) {
    return NextResponse.json({ error: "Missing feature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await admin
    .from("automation_kill_switches")
    .upsert(
      {
        feature,
        disabled,
        reason,
        disabled_by: disabled ? user.email : null,
        disabled_at: disabled ? nowIso : null,
      },
      { onConflict: "feature" },
    );

  if (upsertErr) {
    log.error("kill switch upsert failed", { error: upsertErr.message });
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  invalidateKillSwitchCache();

  await admin.from("admin_action_log").insert({
    admin_email: user.email,
    feature,
    action: "kill_switch",
    target_verdict: disabled ? "disabled" : "enabled",
    reason,
    context: { feature, disabled },
  });

  log.warn("Kill switch flipped", { feature, disabled, adminEmail: user.email });
  return NextResponse.json({ ok: true });
}
