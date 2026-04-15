import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { enqueueJob } from "@/lib/job-queue";

/**
 * POST /api/admin/cohort/refresh
 *
 * Queues an async `refresh_cohort_metrics` job. The job queue
 * worker picks it up on its next run and refreshes the materialised
 * view. Returns immediately so the admin click feels instant.
 */
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const id = await enqueueJob("refresh_cohort_metrics", {
    requested_by: guard.email,
  });
  return NextResponse.json({ ok: true, job_id: id });
}
