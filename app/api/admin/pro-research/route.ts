/**
 * Admin CRUD for `pro_research_reports` — the editorial gap behind
 * FIN_NOTEBOOK Revenue #10 ("premium research pipeline only lacks an
 * admin editorial UI"). The reading surface (/pro/research + [slug],
 * Pro-gated via getSubscription().isPro) and the weekly premium-digest
 * cron already exist; this route lets admins author/publish the rows
 * those surfaces read.
 *
 * Auth: requireAdmin() (ADMIN_EMAILS allow-list + MFA step-up), the
 * same guard as every /api/admin/* route.
 * Body validation: Zod via withValidatedBody (CLAUDE.md
 * `invest/no-unvalidated-req-json`).
 * body_html is sanitised at write time with the same allowlist the
 * render path uses (lib/sanitize-html) — the migration that created
 * the table documents this contract.
 * Lifecycle: created as DRAFT (published_at null); publishing is a
 * deliberate, separately audit-logged PATCH { published: true } —
 * mirrors the country-rule-alerts approval gate.
 * Audit: every mutation writes admin_audit_log.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { sanitizeHtml } from "@/lib/sanitize-html";

const log = logger("admin-pro-research");

/** Must match the pro_research_reports_tier_check DB constraint. */
const TierSchema = z.enum(["pro", "pro_research", "pro_full"]);

const CreateSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits, hyphens only"),
  title: z.string().min(5).max(200),
  kicker: z.string().max(80).default(""),
  summary: z.string().max(2000).default(""),
  body_html: z.string().max(500_000).default(""),
  tier: TierSchema.default("pro"),
  cover_image_url: z.string().max(500).nullable().optional(),
  reading_time_minutes: z.number().int().min(1).max(240).default(10),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
});

const UpdateSchema = CreateSchema.partial().extend({
  id: z.string().uuid(),
  /** true → stamp published_at now (if unset); false → unpublish. */
  published: z.boolean().optional(),
});

/**
 * GET /api/admin/pro-research          — list (no body_html; it can be large)
 * GET /api/admin/pro-research?id=<uuid> — single full row for the editor
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("pro_research_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      log.error("Fetch failed", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("pro_research_reports")
    .select(
      "id, slug, title, kicker, summary, tier, published_at, cover_image_url, reading_time_minutes, tags, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    log.error("List failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

/** POST /api/admin/pro-research — create a new report (always a draft). */
export const POST = withValidatedBody(CreateSchema, async (_req, body) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const insertRow = {
    slug: body.slug,
    title: body.title,
    kicker: body.kicker,
    summary: body.summary,
    body_html: sanitizeHtml(body.body_html),
    tier: body.tier,
    cover_image_url: body.cover_image_url ?? null,
    reading_time_minutes: body.reading_time_minutes,
    tags: body.tags,
    // Approval gate: new reports are drafts; publishing is a deliberate,
    // separately audit-logged PATCH so a mistake is never instantly live
    // (and never instantly emailed by the premium-digest cron).
    published_at: null,
  };

  const { data, error } = await supabase
    .from("pro_research_reports")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    // 23505 = unique_violation on slug
    const status = error.code === "23505" ? 409 : 500;
    if (status === 500) log.error("Insert failed", { error: error.message });
    return NextResponse.json(
      { error: status === 409 ? "A report with this slug already exists" : error.message },
      { status },
    );
  }

  await supabase.from("admin_audit_log").insert({
    action: "pro_research_report:created",
    entity_type: "pro_research_reports",
    entity_id: String(data.id),
    admin_email: guard.email,
    details: { slug: body.slug, title: body.title, created_as_draft: true },
  });

  return NextResponse.json(data, { status: 201 });
});

/**
 * PATCH /api/admin/pro-research — update fields and/or flip publish state.
 */
export const PATCH = withValidatedBody(UpdateSchema, async (_req, body) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id, published, ...fields } = body;
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    ...fields,
    updated_at: new Date().toISOString(),
  };
  if (typeof fields.body_html === "string") {
    updates.body_html = sanitizeHtml(fields.body_html);
  }
  if (fields.cover_image_url !== undefined) {
    updates.cover_image_url = fields.cover_image_url ?? null;
  }
  if (published === true) {
    updates.published_at = new Date().toISOString();
  } else if (published === false) {
    updates.published_at = null;
  }

  const { data, error } = await supabase
    .from("pro_research_reports")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    log.error("Update failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action =
    published === true
      ? "pro_research_report:published"
      : published === false
        ? "pro_research_report:unpublished"
        : "pro_research_report:updated";

  await supabase.from("admin_audit_log").insert({
    action,
    entity_type: "pro_research_reports",
    entity_id: String(id),
    admin_email: guard.email,
    details: { fields: Object.keys(fields), published: published ?? null },
  });

  return NextResponse.json(data);
});

/** DELETE /api/admin/pro-research?id=<uuid> */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pro_research_reports")
    .delete()
    .eq("id", id);
  if (error) {
    log.error("Delete failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "pro_research_report:deleted",
    entity_type: "pro_research_reports",
    entity_id: id,
    admin_email: guard.email,
  });

  return NextResponse.json({ ok: true });
}
