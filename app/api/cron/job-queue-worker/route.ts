import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import {
  getJobHandler,
  computeNextAttempt,
  listRegisteredJobTypes,
} from "@/lib/job-queue";

const log = logger("cron:job-queue-worker");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Worker cron that runs every 5 minutes.
 *
 * Processing loop:
 *   1. Claim up to BATCH_LIMIT ready rows whose scheduled_at <= now.
 *      Claim = UPDATE status=running RETURNING the row. Atomic per
 *      Postgres — two workers running concurrently won't double-
 *      dispatch the same job.
 *   2. Look up the handler by job_type. If not registered → dead-
 *      letter with reason 'unknown_job_type'.
 *   3. Run the handler. On success → done. On non-retryable
 *      failure → dead_letter. On retryable failure → reset to
 *      ready with an exponential backoff scheduled_at.
 *   4. After attempts ≥ max_attempts, force dead_letter.
 *
 * Time budget: 300s max duration ÷ 2s per job = 150 jobs per run,
 * but in practice we cap at BATCH_LIMIT to keep observability
 * manageable.
 */
const BATCH_LIMIT = 50;

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const stats = {
    registered_types: listRegisteredJobTypes().length,
    claimed: 0,
    done: 0,
    retried: 0,
    dead_lettered: 0,
    failed: 0,
  };

  const nowIso = new Date().toISOString();

  // Claim a batch. Supabase doesn't have a single-statement
  // UPDATE ... RETURNING with a LIMIT, so we pull ready ids first,
  // then atomically claim by id. This has a small window where a
  // concurrent claim could race, but the second UPDATE's filter
  // (status = 'ready') guarantees only one worker lands the row.
  const { data: candidateIds } = await supabase
    .from("job_queue")
    .select("id")
    .eq("status", "ready")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (!candidateIds || candidateIds.length === 0) {
    return NextResponse.json({ ok: true, ...stats });
  }

  const ids = candidateIds.map((r) => r.id as number);
  const { data: claimed } = await supabase
    .from("job_queue")
    .update({ status: "running", started_at: nowIso })
    .eq("status", "ready")
    .in("id", ids)
    .select("id, job_type, payload, attempts, max_attempts");

  stats.claimed = claimed?.length || 0;

  for (const row of claimed || []) {
    try {
      const handlerFn = getJobHandler(row.job_type as string);
      if (!handlerFn) {
        await supabase
          .from("job_queue")
          .update({
            status: "dead_letter",
            last_error: `unknown_job_type: ${row.job_type}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        stats.dead_lettered++;
        continue;
      }

      const result = await handlerFn(
        (row.payload as Record<string, unknown>) || {},
      );
      const attempts = ((row.attempts as number) || 0) + 1;

      if (result.ok) {
        await supabase
          .from("job_queue")
          .update({
            status: "done",
            attempts,
            completed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        stats.done++;
        continue;
      }

      // Failure path
      const maxAttempts = (row.max_attempts as number) || 5;
      const retryable = result.retryable !== false;
      if (!retryable || attempts >= maxAttempts) {
        await supabase
          .from("job_queue")
          .update({
            status: "dead_letter",
            attempts,
            last_error: result.error.slice(0, 2000),
            completed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        stats.dead_lettered++;
        continue;
      }

      const next = computeNextAttempt(attempts);
      await supabase
        .from("job_queue")
        .update({
          status: "ready",
          attempts,
          last_error: result.error.slice(0, 2000),
          scheduled_at: next.toISOString(),
          started_at: null,
        })
        .eq("id", row.id);
      stats.retried++;
    } catch (err) {
      stats.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      log.error("job handler threw", { id: row.id, err: msg });
      // Unhandled throw → retryable by default
      const attempts = ((row.attempts as number) || 0) + 1;
      const maxAttempts = (row.max_attempts as number) || 5;
      const patch: Record<string, unknown> =
        attempts >= maxAttempts
          ? {
              status: "dead_letter",
              attempts,
              last_error: msg.slice(0, 2000),
              completed_at: new Date().toISOString(),
            }
          : {
              status: "ready",
              attempts,
              last_error: msg.slice(0, 2000),
              scheduled_at: computeNextAttempt(attempts).toISOString(),
              started_at: null,
            };
      await supabase.from("job_queue").update(patch).eq("id", row.id);
    }
  }

  log.info("job queue worker completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("job-queue-worker", handler);
