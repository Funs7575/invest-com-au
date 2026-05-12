/**
 * Admin CRUD for `placement_experiments`.
 *
 * Auth: ADMIN_EMAILS allow-list (mirrors app/api/admin/country-rule-alerts).
 * Body validation: Zod via withValidatedBody. Audit-logged via admin_audit_log.
 *
 * Endpoints:
 *   GET    /api/admin/placement-experiments?status=running    → list rows
 *   POST   /api/admin/placement-experiments                   → create
 *   PATCH  /api/admin/placement-experiments                   → partial update by id
 *   DELETE /api/admin/placement-experiments?id=<n>            → delete
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminEmails } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { VARIANT_LABEL_PATTERN } from "@/lib/placement-experiments";

const log = logger("admin-placement-experiments");

const StatusSchema = z.enum(["draft", "running", "paused", "completed"]);

const VariantSchema = z.object({
  label: z.string().regex(VARIANT_LABEL_PATTERN, {
    message: "label must match [a-z0-9][a-z0-9_-]{0,30}",
  }),
  broker_slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits, hyphens only")
    .nullable(),
  weight: z.number().int().min(0).max(10000),
});

const CreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9/_-]{1,80}$/, {
    message: "slug must match [a-z0-9][a-z0-9/_-]{1,80}",
  }),
  name: z.string().min(1).max(200),
  status: StatusSchema.default("draft"),
  variants: z.array(VariantSchema).min(2).max(8),
  notes: z.string().max(2000).nullable().optional(),
});

const UpdateSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(200).optional(),
    status: StatusSchema.optional(),
    variants: z.array(VariantSchema).min(2).max(8).optional(),
    notes: z.string().max(2000).nullable().optional(),
    winner_variant: z
      .string()
      .regex(VARIANT_LABEL_PATTERN)
      .nullable()
      .optional(),
  })
  .strict();

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

/** Reject duplicate variant labels — they would collide in the metrics jsonb. */
function uniqueLabels<T extends { label: string }>(variants: T[]): boolean {
  const seen = new Set<string>();
  for (const v of variants) {
    if (seen.has(v.label)) return false;
    seen.add(v.label);
  }
  return true;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const supabase = createAdminClient();
  let query = supabase
    .from("placement_experiments")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (status) {
    const parsed = StatusSchema.safeParse(status);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    query = query.eq("status", parsed.data);
  }

  const { data, error } = await query;
  if (error) {
    log.error("List failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

export const POST = withValidatedBody(CreateSchema, async (_req, body) => {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!uniqueLabels(body.variants)) {
    return NextResponse.json(
      { error: "variant labels must be unique" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const insertRow = {
    slug: body.slug,
    name: body.name,
    status: body.status,
    variants: body.variants,
    notes: body.notes ?? null,
    started_at: body.status === "running" ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase
    .from("placement_experiments")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    log.error("Insert failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "placement_experiment:created",
    entity_type: "placement_experiments",
    entity_id: String(data.id),
    admin_email: admin.email,
    details: { slug: body.slug, status: body.status },
  });

  return NextResponse.json(data, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateSchema, async (_req, body) => {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (body.variants && !uniqueLabels(body.variants)) {
    return NextResponse.json(
      { error: "variant labels must be unique" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Status transitions: stamp started_at on first → running, ended_at on
  // transition to completed. Keep idempotent so re-applying the same status
  // doesn't reset timestamps.
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.status !== undefined) updates.status = body.status;
  if (body.variants !== undefined) updates.variants = body.variants;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.winner_variant !== undefined) updates.winner_variant = body.winner_variant;

  if (body.status === "running") {
    // Stamp started_at if missing.
    const { data: existing } = await supabase
      .from("placement_experiments")
      .select("started_at")
      .eq("id", body.id)
      .maybeSingle();
    if (existing && !existing.started_at) {
      updates.started_at = new Date().toISOString();
    }
  } else if (body.status === "completed") {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("placement_experiments")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) {
    log.error("Update failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "placement_experiment:updated",
    entity_type: "placement_experiments",
    entity_id: String(body.id),
    admin_email: admin.email,
    details: updates,
  });

  return NextResponse.json(data);
});

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
    .from("placement_experiments")
    .delete()
    .eq("id", parseInt(id, 10));
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "placement_experiment:deleted",
    entity_type: "placement_experiments",
    entity_id: id,
    admin_email: admin.email,
  });

  return NextResponse.json({ ok: true });
}
