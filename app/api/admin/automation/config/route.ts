import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { invalidateClassifierConfigCache } from "@/lib/admin/classifier-config";

const log = logger("admin:automation:config");

/**
 * Classifier threshold editor endpoint.
 *
 *  GET  — returns every row from classifier_config for the UI.
 *  POST — upserts a single threshold. Body: { classifier, thresholdName, value, reason? }
 *
 * Guardrails: if the target row has min_value/max_value set, writes
 * outside those bounds are rejected. Every successful write is
 * audited to admin_action_log with action='config'.
 *
 * After a write we invalidate the in-process config cache so the
 * next classifier call picks up the new value immediately instead
 * of waiting for the 60-second TTL.
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("classifier_config")
    .select("id, classifier, threshold_name, value, min_value, max_value, description, updated_by, updated_at")
    .order("classifier", { ascending: true })
    .order("threshold_name", { ascending: true });

  if (error) {
    log.error("classifier_config fetch failed", { error: error.message });
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
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const classifier: string | null = typeof body.classifier === "string" ? body.classifier : null;
  const thresholdName: string | null = typeof body.thresholdName === "string" ? body.thresholdName : null;
  const value: number | null = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null;
  const reason: string | null = typeof body.reason === "string" ? body.reason : null;
  const description: string | null = typeof body.description === "string" ? body.description : null;
  const minValue: number | null = typeof body.minValue === "number" ? body.minValue : null;
  const maxValue: number | null = typeof body.maxValue === "number" ? body.maxValue : null;

  if (!classifier || !thresholdName || value == null) {
    return NextResponse.json(
      { error: "Missing classifier / thresholdName / value" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Fetch existing row for bounds check. If it doesn't exist this is
  // an insert — the body-provided minValue/maxValue become the new
  // guardrails.
  const { data: existing } = await admin
    .from("classifier_config")
    .select("id, min_value, max_value")
    .eq("classifier", classifier)
    .eq("threshold_name", thresholdName)
    .maybeSingle();

  const effectiveMin = existing?.min_value ?? minValue;
  const effectiveMax = existing?.max_value ?? maxValue;
  if (effectiveMin != null && value < Number(effectiveMin)) {
    return NextResponse.json(
      { error: `Value ${value} below configured minimum ${effectiveMin}` },
      { status: 400 },
    );
  }
  if (effectiveMax != null && value > Number(effectiveMax)) {
    return NextResponse.json(
      { error: `Value ${value} above configured maximum ${effectiveMax}` },
      { status: 400 },
    );
  }

  const { error: upsertErr } = await admin
    .from("classifier_config")
    .upsert(
      {
        classifier,
        threshold_name: thresholdName,
        value,
        min_value: existing?.min_value ?? minValue,
        max_value: existing?.max_value ?? maxValue,
        description: existing ? undefined : description,
        updated_by: user.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "classifier,threshold_name" },
    );

  if (upsertErr) {
    log.error("classifier_config upsert failed", { error: upsertErr.message });
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // Invalidate the process cache so the new value is live immediately.
  invalidateClassifierConfigCache(classifier);

  // Audit
  await admin.from("admin_action_log").insert({
    admin_email: user.email,
    feature: classifier,
    action: "config",
    target_row_id: null,
    target_verdict: null,
    reason,
    context: { threshold_name: thresholdName, value },
  });

  log.info("classifier_config updated", {
    classifier,
    thresholdName,
    value,
    adminEmail: user.email,
  });
  return NextResponse.json({ ok: true });
}
