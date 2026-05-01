import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:quarterly-reports");

export const runtime = "nodejs";

/**
 * /api/admin/quarterly-reports
 *
 *   GET    — list every report row (incl. drafts), sorted year DESC, quarter DESC.
 *   POST   — create a new report.
 *   PATCH  — update an existing report by `id`.
 *   DELETE — delete a report by `id` (passed as `?id=` query param).
 *
 * Auth:
 *   - `proxy.ts` does NOT gate `/api/admin/*` paths today (only `/admin/*`
 *     for the page tree and `/api/cron/*` for cron jobs). Each handler
 *     therefore relies on `requireAdmin()` from `lib/require-admin.ts`,
 *     which is the established pattern across `app/api/admin/*`. If a
 *     future change to `proxy.ts` adds an `/api/admin/*` allowlist, the
 *     `requireAdmin()` calls remain a defence-in-depth check.
 *
 * RLS:
 *   - `quarterly_reports` has RLS enabled (`20260429_o_iter7_…sql`):
 *       * anon/authenticated  → SELECT  WHERE status = 'published'
 *       * service_role        → ALL                     (no row filter)
 *     This route uses `createAdminClient()` (service-role) so it can
 *     SELECT drafts and perform writes that the anon-key client cannot.
 *     The migration shipped with C-05b re-asserts the same policies
 *     idempotently with a new naming scheme — see
 *     `20260501_c05b_quarterly_reports_rls.sql`.
 *
 * Why we replaced the browser-anon-key client on `app/admin/quarterly-reports/page.tsx`:
 *   - The old page used `lib/supabase/client.ts` (anon key) for
 *     SELECT-all/INSERT/UPDATE/DELETE on `quarterly_reports`. With the
 *     post-O-iter7 RLS policies in place the writes silently fail; with
 *     the policies removed (the prior state) anyone with the anon key
 *     could CRUD via PostgREST regardless of admin status. Routing the
 *     admin UI through this service-role API is the only way to keep
 *     drafts hidden + writes restricted while still letting the public
 *     `/reports` page read published rows as anon.
 */

// ── Validation schemas ────────────────────────────────────────────────────────

// Status enum mirrors the CHECK constraint in
// supabase/migrations/20260316_q1_2026_report.sql.
const StatusEnum = z.enum(["draft", "published"]);

// Sections / key_findings / fee_changes_summary are JSONB columns. We
// validate shape lightly — the admin UI sends arrays of objects/strings
// and we don't want to reject legitimate editor edits over a tightened
// schema. The DB column accepts any JSON.
const SectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});
const FeeChangeSchema = z.object({
  broker: z.string(),
  field: z.string(),
  old_value: z.string(),
  new_value: z.string(),
});

const CreateBodySchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  quarter: z.string().min(1).max(8),
  year: z.number().int().min(2000).max(2100),
  executive_summary: z.string().nullable().optional(),
  sections: z.array(SectionSchema).default([]),
  key_findings: z.array(z.string()).default([]),
  fee_changes_summary: z.array(FeeChangeSchema).default([]),
  new_entrants: z.array(z.string()).default([]),
  status: StatusEnum,
  cover_image_url: z.string().url().nullable().optional(),
});

const UpdateBodySchema = CreateBodySchema.partial().extend({
  id: z.number().int().positive(),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quarterly_reports")
    .select("*")
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });
  if (error) {
    log.error("quarterly_reports list failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const raw = await request.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateBodySchema.safeParse(raw);
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
  const body = parsed.data;

  const supabase = createAdminClient();
  const insertPayload = {
    title: body.title,
    slug: body.slug,
    quarter: body.quarter,
    year: body.year,
    executive_summary: body.executive_summary ?? null,
    sections: body.sections,
    key_findings: body.key_findings,
    fee_changes_summary: body.fee_changes_summary,
    new_entrants: body.new_entrants,
    status: body.status,
    cover_image_url: body.cover_image_url ?? null,
    published_at: body.status === "published" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error } = await supabase
    .from("quarterly_reports")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    log.error("quarterly_reports insert failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "quarterly_report:created",
    entity_type: "quarterly_report",
    entity_id: String(inserted.id),
    entity_name: body.title,
    admin_email: guard.email,
    details: { quarter: body.quarter, year: body.year, status: body.status },
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const raw = await request.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = UpdateBodySchema.safeParse(raw);
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
  const { id, ...body } = parsed.data;

  // Build the update object only from fields the caller actually sent.
  // Avoids stomping columns to NULL when the caller only meant to flip
  // a single field.
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.title !== undefined) update.title = body.title;
  if (body.slug !== undefined) update.slug = body.slug;
  if (body.quarter !== undefined) update.quarter = body.quarter;
  if (body.year !== undefined) update.year = body.year;
  if (body.executive_summary !== undefined)
    update.executive_summary = body.executive_summary ?? null;
  if (body.sections !== undefined) update.sections = body.sections;
  if (body.key_findings !== undefined) update.key_findings = body.key_findings;
  if (body.fee_changes_summary !== undefined)
    update.fee_changes_summary = body.fee_changes_summary;
  if (body.new_entrants !== undefined) update.new_entrants = body.new_entrants;
  if (body.cover_image_url !== undefined)
    update.cover_image_url = body.cover_image_url ?? null;
  if (body.status !== undefined) {
    update.status = body.status;
    // Stamp published_at on the published transition; null it otherwise
    // so re-drafted rows don't keep a stale timestamp.
    update.published_at =
      body.status === "published" ? new Date().toISOString() : null;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quarterly_reports")
    .update(update)
    .eq("id", id);
  if (error) {
    log.error("quarterly_reports update failed", { error: error.message, id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "quarterly_report:updated",
    entity_type: "quarterly_report",
    entity_id: String(id),
    entity_name: body.title ?? `report #${id}`,
    admin_email: guard.email,
    details: {
      // Cast unknowns to JSON-friendly shapes for the audit log.
      ...(typeof update.status === "string" ? { status: update.status } : {}),
      ...(typeof update.title === "string" ? { title: update.title } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const idParam = request.nextUrl.searchParams.get("id");
  const id = idParam ? Number(idParam) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Missing or invalid id query parameter" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quarterly_reports")
    .delete()
    .eq("id", id);
  if (error) {
    log.error("quarterly_reports delete failed", { error: error.message, id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "quarterly_report:deleted",
    entity_type: "quarterly_report",
    entity_id: String(id),
    entity_name: `report #${id}`,
    admin_email: guard.email,
    details: {},
  });

  return NextResponse.json({ ok: true });
}
