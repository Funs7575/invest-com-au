/**
 * /api/firm-portal/jobs
 *
 * Firm-admin–only endpoints for managing job posts.
 *
 *   GET    — lists all posts (any status) for the authed firm admin's firm.
 *   POST   — creates a new job post (defaults to draft; body: title, location,
 *            type, description, status?).
 *
 * Auth: requires the calling user to be an active firm admin (is_firm_admin=true
 * on their professionals row). The firm_id is resolved server-side — clients
 * never pass firm_id directly (prevents IDOR).
 *
 * RLS note: job_posts_firm_admin_all already enforces this in the DB; we do a
 * server-side check first to return a friendly 403 rather than a silent empty
 * result.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("firm-portal:jobs");

const VALID_TYPES = ["full_time", "part_time", "contract", "casual"] as const;
const VALID_STATUSES = ["draft", "active", "closed", "archived"] as const;

const CreateJobSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters.")
    .max(200, "Title must be 200 characters or fewer."),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters.")
    .max(100, "Location must be 100 characters or fewer."),
  type: z.enum(VALID_TYPES, {
    errorMap: () => ({
      message: "Type must be full_time, part_time, contract, or casual.",
    }),
  }),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(8000, "Description must be 8 000 characters or fewer."),
  status: z.enum(VALID_STATUSES).optional().default("draft"),
});

/** Resolves the calling user's firm_id + pro id. Returns null if not a firm admin. */
async function resolveFirmAdmin(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin, status")
    .eq("auth_user_id", userId)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!data || !data.firm_id || !data.is_firm_admin) return null;
  return { proId: data.id as string, firmId: data.firm_id as string };
}

/** GET /api/firm-portal/jobs — list all posts for the authed firm */
export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`firm-jobs-get:${ip}`, 120, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const ctx = await resolveFirmAdmin(user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "Firm admin access required." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: posts, error } = await admin
      .from("job_posts")
      .select("id, title, location, type, description, status, created_at, updated_at")
      .eq("firm_id", ctx.firmId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Jobs GET error", { error: error.message, firmId: ctx.firmId });
      return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
    }

    return NextResponse.json({ jobs: posts ?? [] });
  } catch (err) {
    log.error("Jobs GET unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

/** POST /api/firm-portal/jobs — create a new job post */
export const POST = withValidatedBody(CreateJobSchema, async (req: NextRequest, body) => {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`firm-jobs-post:${ip}`, 20, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const ctx = await resolveFirmAdmin(user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "Firm admin access required." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: post, error } = await admin
      .from("job_posts")
      .insert({
        firm_id: ctx.firmId,
        created_by: user.id,
        title: body.title.trim(),
        location: body.location.trim(),
        type: body.type,
        description: body.description.trim(),
        status: body.status,
      })
      .select("id, title, location, type, description, status, created_at")
      .single();

    if (error) {
      log.error("Jobs POST insert error", { error: error.message });
      return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
    }

    return NextResponse.json({ job: post }, { status: 201 });
  } catch (err) {
    log.error("Jobs POST unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
});
