import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { enqueueJob } from "@/lib/job-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("admin:content:batch-generate");

/**
 * POST /api/admin/content/batch-generate
 *
 * Body: { calendar_ids: number[] }
 *
 * Enqueues one `generate_article_draft` job per calendar item.
 * The job queue worker picks them up at its next run (or immediately
 * if triggered manually from /admin/automation/jobs).
 *
 * Why async: generating a 2000-word article via Claude takes
 * 20-30 seconds per piece. Running a batch of 20 synchronously in
 * the request path blows past the function timeout. The queue lets
 * us spread the work across multiple worker runs and retry
 * individual items on transient failures without re-generating
 * the rest of the batch.
 *
 * Dispatches to the existing /api/admin/content/generate-draft
 * endpoint via a `send_http_request` job (handler added here
 * alongside send_email).
 */
const MAX_BATCH = 50;

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body.calendar_ids)
    ? body.calendar_ids.filter((v: unknown): v is number => typeof v === "number")
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No calendar_ids" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Batch size exceeds ${MAX_BATCH}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // Verify the calendar ids exist so we don't queue jobs for
  // phantom rows.
  const { data: found } = await admin
    .from("content_calendar")
    .select("id, title")
    .in("id", ids);
  if (!found || found.length === 0) {
    return NextResponse.json({ error: "No matching calendar items" }, { status: 404 });
  }

  const queued: number[] = [];
  for (const item of found) {
    const jobId = await enqueueJob("generate_article_draft", {
      calendar_id: item.id,
      title: item.title,
      requested_by: guard.email,
    });
    if (jobId) queued.push(jobId);
  }

  log.info("Batch content generation queued", {
    admin: guard.email,
    count: queued.length,
  });
  return NextResponse.json({
    ok: true,
    queued: queued.length,
    total_requested: ids.length,
  });
}
