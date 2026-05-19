/**
 * Admin CRUD for `country_schemes`.
 *
 * Auth: ADMIN_EMAILS allow-list (mirrors app/api/admin/regulatory-impacts).
 * Body validation: Zod via withValidatedBody for POST/PATCH (CLAUDE.md
 * `invest/no-unvalidated-req-json` rule). Audit-logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  SchemeAudienceSchema,
  SchemeCategorySchema,
} from "@/lib/country-schemes";

const log = logger("admin-country-schemes");

const CreateSchema = z.object({
  country_code: z.string().length(2).transform((s) => s.toUpperCase()),
  audience: SchemeAudienceSchema,
  category: SchemeCategorySchema,
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  body_md: z.string().min(1).max(8000),
  threshold_cents: z.number().int().nullable().optional(),
  threshold_label: z.string().max(80).nullable().optional(),
  source_name: z.string().min(1).max(200),
  source_url: z.string().url(),
  sourced_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stales_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  display_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

const UpdateSchema = CreateSchema.partial().extend({
  id: z.number().int().positive(),
});


/** GET /api/admin/country-schemes?country_code=GB */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const code = request.nextUrl.searchParams.get("country_code");
  const supabase = createAdminClient();
  let query = supabase
    .from("country_schemes")
    .select("*")
    .order("country_code", { ascending: true })
    .order("display_order", { ascending: true });

  if (code) query = query.eq("country_code", code.toUpperCase());

  const { data, error } = await query;
  if (error) {
    log.error("List failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

/** POST /api/admin/country-schemes — create a new row */
export const POST = withValidatedBody(CreateSchema, async (_req, body) => {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("country_schemes")
    .insert(body)
    .select("*")
    .single();

  if (error) {
    log.error("Insert failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "country_scheme:created",
    entity_type: "country_schemes",
    entity_id: String(data.id),
    admin_email: guard.email,
    details: { country_code: body.country_code, name: body.name },
  });

  return NextResponse.json(data, { status: 201 });
});

/** PATCH /api/admin/country-schemes — update an existing row by id */
export const PATCH = withValidatedBody(UpdateSchema, async (_req, body) => {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const { id, ...updates } = body;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("country_schemes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    log.error("Update failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "country_scheme:updated",
    entity_type: "country_schemes",
    entity_id: String(id),
    admin_email: guard.email,
    details: updates,
  });

  return NextResponse.json(data);
});

/** DELETE /api/admin/country-schemes?id=123 */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("country_schemes")
    .delete()
    .eq("id", parseInt(id, 10));
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "country_scheme:deleted",
    entity_type: "country_schemes",
    entity_id: id,
    admin_email: guard.email,
  });

  return NextResponse.json({ ok: true });
}
