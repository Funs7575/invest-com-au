/**
 * /api/firm-portal/jobs/[id]
 *
 * Firm-admin–only endpoints for a single job post.
 *
 *   PATCH  — update title / location / type / description / status
 *   DELETE — soft-archive (sets status='archived')
 *
 * Ownership is enforced server-side: the calling user's firm must own the post.
 * Uses the admin client for the ownership check + mutation so RLS
 * (job_posts_firm_admin_all) is still the last line of defence in the DB but
 * the app never relies solely on it.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("firm-portal:jobs:[id]");

const VALID_TYPES = ["full_time", "part_time", "contract", "casual"] as const;
const VALID_STATUSES = ["draft", "active", "closed", "archived"] as const;

const PatchJobSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  location: z.string().min(2).max(100).optional(),
  type: z.enum(VALID_TYPES).optional(),
  description: z.string().min(10).max(8000).optional(),
  status: z.enum(VALID_STATUSES).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Resolves the calling user's firm_id. Returns null if not a firm admin. */
async function resolveFirmId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("firm_id, is_firm_admin, status")
    .eq("auth_user_id", userId)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!data || !data.firm_id || !data.is_firm_admin) return null;
  return data.firm_id as string;
}

/** Verifies that the given job post belongs to the given firm. */
async function assertOwnership(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  firmId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("job_posts")
    .select("id")
    .eq("id", jobId)
    .eq("firm_id", firmId)
    .maybeSingle();
  return !!data;
}

/**
 * PATCH /api/firm-portal/jobs/[id] — update a job post.
 *
 * Note: withValidatedBody only supports (req, body) — the route context is
 * not forwarded. We extract the job id from the URL pathname instead.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`firm-jobs-patch:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let raw: unknown;
    try {
      // eslint-disable-next-line invest/no-unvalidated-req-json -- validated with PatchJobSchema.safeParse immediately below; try/catch needed to return 400 on malformed JSON
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = PatchJobSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first?.path?.join(".") ?? "";
      const msg = first?.message ?? "Invalid request body";
      return NextResponse.json(
        { error: path ? `${path}: ${msg}` : msg },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const firmId = await resolveFirmId(user.id);
    if (!firmId) {
      return NextResponse.json(
        { error: "Firm admin access required." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const owns = await assertOwnership(admin, id, firmId);
    if (!owns) {
      return NextResponse.json({ error: "Job post not found." }, { status: 404 });
    }

    // Build update payload — only include provided fields.
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) update.title = body.title.trim();
    if (body.location !== undefined) update.location = body.location.trim();
    if (body.type !== undefined) update.type = body.type;
    if (body.description !== undefined) update.description = body.description.trim();
    if (body.status !== undefined) update.status = body.status;

    const { data: updated, error } = await admin
      .from("job_posts")
      .update(update)
      .eq("id", id)
      .select("id, title, location, type, description, status, updated_at")
      .single();

    if (error) {
      log.error("Jobs PATCH error", { error: error.message, jobId: id });
      return NextResponse.json({ error: "Failed to update job." }, { status: 500 });
    }

    return NextResponse.json({ job: updated });
  } catch (err) {
    log.error("Jobs PATCH unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

/** DELETE /api/firm-portal/jobs/[id] — archive a job post */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`firm-jobs-delete:${ip}`, 20, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const firmId = await resolveFirmId(user.id);
    if (!firmId) {
      return NextResponse.json(
        { error: "Firm admin access required." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const owns = await assertOwnership(admin, id, firmId);
    if (!owns) {
      return NextResponse.json({ error: "Job post not found." }, { status: 404 });
    }

    const { error } = await admin
      .from("job_posts")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      log.error("Jobs DELETE error", { error: error.message, jobId: id });
      return NextResponse.json({ error: "Failed to archive job." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("Jobs DELETE unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
