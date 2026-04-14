/**
 * Async job queue client + pure helpers.
 *
 * The `job_queue` table was created in Wave 6 with the status
 * machine: ready → running → done | error | dead_letter. This
 * file wraps it with:
 *
 *   - enqueueJob(type, payload, opts)  — add a job, returns id
 *   - computeNextAttempt(attempts, …)  — pure exponential backoff
 *   - mapSupportedJobTypes              — registry of handlers
 *
 * The worker cron (`/api/cron/job-queue-worker`) claims ready rows
 * older than `scheduled_at`, flips them to `running`, dispatches
 * to the handler registered for the type, and moves them to
 * `done` / `error` (with retry) / `dead_letter` (after max_attempts).
 *
 * Why not a proper bullmq / Redis queue: Supabase Postgres already
 * gives us durability + row-level claims via UPDATE ... RETURNING.
 * One less moving part, one less vendor, and the existing admin
 * dashboard already has Postgres as a first-class citizen.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("job-queue");

export interface EnqueueOptions {
  /** Delay the job this many seconds past now. 0 = run ASAP. */
  delaySeconds?: number;
  /** How many attempts before we give up. Default 5. */
  maxAttempts?: number;
  /** Override the initial scheduled_at (overrides delaySeconds) */
  scheduledAt?: Date;
}

export async function enqueueJob(
  jobType: string,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {},
): Promise<number | null> {
  const supabase = createAdminClient();
  const scheduled =
    options.scheduledAt ||
    (options.delaySeconds
      ? new Date(Date.now() + options.delaySeconds * 1000)
      : new Date());

  const { data, error } = await supabase
    .from("job_queue")
    .insert({
      job_type: jobType,
      payload,
      status: "ready",
      max_attempts: options.maxAttempts ?? 5,
      scheduled_at: scheduled.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    log.error("enqueueJob failed", { jobType, error: error.message });
    return null;
  }
  return data.id as number;
}

/**
 * Pure exponential-backoff calculator.
 *
 *   attempts 1 → 30 seconds
 *   attempts 2 → 2 minutes
 *   attempts 3 → 15 minutes
 *   attempts 4 → 1 hour
 *   attempts 5+ → 4 hours (capped)
 *
 * Exported so the unit test can assert every case.
 */
export function computeNextAttempt(
  attempts: number,
  now: Date = new Date(),
): Date {
  const delaysSec = [30, 120, 900, 3600, 14_400];
  const idx = Math.min(Math.max(attempts - 1, 0), delaysSec.length - 1);
  return new Date(now.getTime() + delaysSec[idx] * 1000);
}

// ─── Handler registry ─────────────────────────────────────────────

export type JobHandler = (payload: Record<string, unknown>) => Promise<
  { ok: true } | { ok: false; error: string; retryable?: boolean }
>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(jobType: string, handler: JobHandler): void {
  handlers.set(jobType, handler);
}

export function getJobHandler(jobType: string): JobHandler | undefined {
  return handlers.get(jobType);
}

export function listRegisteredJobTypes(): string[] {
  return [...handlers.keys()].sort();
}

// ─── Built-in handlers ────────────────────────────────────────────

registerJobHandler("send_email", async (payload) => {
  const to = payload.to as string;
  const subject = payload.subject as string;
  const html = payload.html as string;
  if (!to || !subject || !html) {
    return { ok: false, error: "missing to/subject/html", retryable: false };
  }
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured", retryable: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: (payload.from as string) || "Invest.com.au <hello@invest.com.au>",
      to: [to],
      subject,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return {
      ok: false,
      error: `resend HTTP ${res.status}: ${txt.slice(0, 200)}`,
      // 4xx = don't retry (bad payload); 5xx + 429 = retry
      retryable: res.status >= 500 || res.status === 429,
    };
  }
  return { ok: true };
});

registerJobHandler("recompute_advisor_health", async (payload) => {
  // Forward to the health scorer library
  const { recomputeAdvisorHealth } = await import("@/lib/advisor-health");
  const advisorId = Number(payload.advisor_id);
  if (!Number.isFinite(advisorId)) {
    return { ok: false, error: "invalid advisor_id", retryable: false };
  }
  await recomputeAdvisorHealth(advisorId);
  return { ok: true };
});

registerJobHandler("refresh_cohort_metrics", async () => {
  const supabase = createAdminClient();
  // Needs SECURITY DEFINER on a refresh function, OR the caller
  // must be service_role. Supabase admin client is service_role.
  const { error } = await supabase.rpc("refresh_advisor_cohort_metrics");
  if (error) {
    return { ok: false, error: error.message, retryable: true };
  }
  return { ok: true };
});

/**
 * Generate an article draft for a content_calendar row by
 * forwarding to the existing /api/admin/content/generate-draft
 * endpoint (which uses Claude / Anthropic). Batch generation
 * reuses this single-draft code path and spreads the 20-30 sec
 * per-draft cost across multiple worker runs.
 */
registerJobHandler("generate_article_draft", async (payload) => {
  const calendarId = Number(payload.calendar_id);
  if (!Number.isFinite(calendarId)) {
    return { ok: false, error: "invalid calendar_id", retryable: false };
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return { ok: false, error: "CRON_SECRET not configured", retryable: true };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
  const res = await fetch(`${siteUrl}/api/admin/content/generate-draft`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ calendarId }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return {
      ok: false,
      error: `generate-draft HTTP ${res.status}: ${txt.slice(0, 200)}`,
      retryable: res.status >= 500 || res.status === 429,
    };
  }
  return { ok: true };
});
