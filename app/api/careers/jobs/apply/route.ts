/**
 * POST /api/careers/jobs/apply
 *
 * Public write endpoint — submits a job application.
 * - Zod-validated body via withValidatedBody.
 * - Rate-limited per IP: 5 applications per 60 min (prevents spam).
 * - Checks the referenced job exists and is active before inserting.
 * - Uses the anon Supabase client; the job_applications_anon_insert RLS
 *   policy enforces that the referenced job_post is active.
 *
 * Body: { job_id, applicant_name, applicant_email, message }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("careers:apply");

const ApplySchema = z.object({
  job_id: z.string().uuid({ message: "Invalid job reference." }),
  applicant_name: z
    .string()
    .min(1, "Name is required.")
    .max(120, "Name too long."),
  applicant_email: z
    .string()
    .email("A valid email address is required."),
  message: z
    .string()
    .min(10, "Cover message must be at least 10 characters.")
    .max(3000, "Cover message must be 3 000 characters or fewer."),
});

export const POST = withValidatedBody(ApplySchema, async (req: NextRequest, body) => {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (await isRateLimited(`careers-apply:${ip}`, 5, 60)) {
      return NextResponse.json(
        { error: "Too many applications. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // Verify the job is active — belt-and-suspenders on top of RLS.
    const { data: job, error: jobErr } = await supabase
      .from("job_posts")
      .select("id, status")
      .eq("id", body.job_id)
      .eq("status", "active")
      .maybeSingle();

    if (jobErr) {
      log.error("Apply: job lookup error", { error: jobErr.message });
      return NextResponse.json(
        { error: "Failed to verify job listing." },
        { status: 500 },
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: "Job listing not found or no longer accepting applications." },
        { status: 404 },
      );
    }

    const { error: insertErr } = await supabase.from("job_applications").insert({
      job_id: body.job_id,
      applicant_name: body.applicant_name.trim(),
      applicant_email: body.applicant_email.toLowerCase().trim(),
      message: body.message.trim(),
    });

    if (insertErr) {
      log.error("Apply: insert error", { error: insertErr.message });
      return NextResponse.json(
        { error: "Failed to submit application. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("Apply: unexpected error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
});
