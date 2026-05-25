/**
 * GET /api/firm-portal/jobs/[id]/applications
 *
 * Returns all job applications for a specific post, restricted to the owning
 * firm admin. Mirrors the job_applications_firm_admin_read RLS policy but
 * enforces ownership server-side first to return a useful 403/404.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("firm-portal:jobs:applications");

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: jobId } = await ctx.params;
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`firm-apps-get:${ip}`, 120, 60)) {
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

    // Verify the job belongs to this firm.
    const { data: job } = await admin
      .from("job_posts")
      .select("id")
      .eq("id", jobId)
      .eq("firm_id", firmId)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ error: "Job post not found." }, { status: 404 });
    }

    const { data: applications, error } = await admin
      .from("job_applications")
      .select("id, applicant_name, applicant_email, message, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Applications GET error", { error: error.message, jobId });
      return NextResponse.json(
        { error: "Failed to load applications." },
        { status: 500 },
      );
    }

    return NextResponse.json({ applications: applications ?? [] });
  } catch (err) {
    log.error("Applications GET unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
