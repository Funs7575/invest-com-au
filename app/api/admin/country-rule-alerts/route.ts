/**
 * Admin CRUD for `country_rule_alerts`.
 *
 * Auth: ADMIN_EMAILS allow-list (mirrors app/api/admin/country-schemes).
 * Body validation: Zod via withValidatedBody for POST/PATCH (CLAUDE.md
 * `invest/no-unvalidated-req-json` rule). Audit-logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminEmails } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  AlertCountrySchema,
  AlertSeveritySchema,
  COUNTRY_RULE_ALERT_COUNTRIES,
} from "@/lib/country-rule-alerts";

const log = logger("admin-country-rule-alerts");

const CreateSchema = z.object({
  alert_key: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits, hyphens only"),
  country_code: AlertCountrySchema,
  severity: AlertSeveritySchema,
  headline: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  source: z.string().min(1).max(120),
  cta_href: z.string().max(500).nullable().optional(),
  cta_label: z.string().max(120).nullable().optional(),
  stales_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  display_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

const UpdateSchema = CreateSchema.partial().extend({
  id: z.number().int().positive(),
});

async function requireAdmin(): Promise<{ email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const allowed = getAdminEmails();
  const email = user.email.toLowerCase();
  if (!allowed.includes(email)) return null;
  return { email };
}

/** GET /api/admin/country-rule-alerts?country_code=uk */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("country_code");
  let lowerCode: string | null = null;
  if (code) {
    lowerCode = code.toLowerCase();
    if (
      !(COUNTRY_RULE_ALERT_COUNTRIES as readonly string[]).includes(lowerCode)
    ) {
      return NextResponse.json({ error: "Invalid country_code" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("country_rule_alerts")
    .select("*")
    .order("country_code", { ascending: true })
    .order("display_order", { ascending: true });

  if (lowerCode) {
    query = query.eq("country_code", lowerCode);
  }

  const { data, error } = await query;
  if (error) {
    log.error("List failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

/** POST /api/admin/country-rule-alerts — create a new row */
export const POST = withValidatedBody(CreateSchema, async (_req, body) => {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const insertRow = {
    alert_key: body.alert_key,
    country_code: body.country_code,
    severity: body.severity,
    headline: body.headline,
    body: body.body,
    source: body.source,
    cta_href: body.cta_href ?? null,
    cta_label: body.cta_label ?? null,
    stales_at: body.stales_at,
    display_order: body.display_order,
    active: body.active,
  };
  const { data, error } = await supabase
    .from("country_rule_alerts")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    log.error("Insert failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "country_rule_alert:created",
    entity_type: "country_rule_alerts",
    entity_id: String(data.id),
    admin_email: admin.email,
    details: { country_code: body.country_code, alert_key: body.alert_key },
  });

  return NextResponse.json(data, { status: 201 });
});

/** PATCH /api/admin/country-rule-alerts — update an existing row by id */
export const PATCH = withValidatedBody(UpdateSchema, async (_req, body) => {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...updates } = body;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("country_rule_alerts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    log.error("Update failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "country_rule_alert:updated",
    entity_type: "country_rule_alerts",
    entity_id: String(id),
    admin_email: admin.email,
    details: updates,
  });

  return NextResponse.json(data);
});

/** DELETE /api/admin/country-rule-alerts?id=123 */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("country_rule_alerts")
    .delete()
    .eq("id", parseInt(id, 10));
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "country_rule_alert:deleted",
    entity_type: "country_rule_alerts",
    entity_id: id,
    admin_email: admin.email,
  });

  return NextResponse.json({ ok: true });
}
