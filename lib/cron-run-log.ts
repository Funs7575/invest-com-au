import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { NextRequest, NextResponse } from "next/server";

const log = logger("cron-run-log");

/**
 * Wraps a cron handler with run-tracking.
 *
 * Every cron route writes a row to `cron_run_log` on start and
 * updates it on completion with status + stats + duration. This
 * powers the admin automation dashboard's "is this healthy?" checks
 * because Vercel's cron log UI only retains 24h and is not
 * queryable.
 *
 * Usage:
 *
 *     export async function GET(req: NextRequest) {
 *       const unauth = requireCronAuth(req);
 *       if (unauth) return unauth;
 *
 *       return withCronRunLog("my_cron_name", async () => {
 *         // ... cron body
 *         return { ok: true, stats: { scanned: 10 } };
 *       }, { triggeredBy: req.headers.get("x-admin-manual") ? "admin_manual" : "cron" });
 *     }
 *
 * Returns the NextResponse the handler built, so the caller just
 * wraps their existing logic. If the handler throws, the run row
 * gets status='error' with the message, and the error is re-thrown
 * so Sentry still catches it.
 */
export async function withCronRunLog<T>(
  cronName: string,
  handler: () => Promise<{ response: T; stats?: Record<string, unknown> }>,
  options: { triggeredBy?: "cron" | "admin_manual" | "test" } = {},
): Promise<T> {
  const supabase = createAdminClient();
  const startedAt = new Date();
  const triggeredBy = options.triggeredBy || "cron";

  // Insert a "running" row immediately so a hanging cron shows up as
  // running rather than invisible.
  const { data: logRow, error: insertErr } = await supabase
    .from("cron_run_log")
    .insert({
      name: cronName,
      started_at: startedAt.toISOString(),
      status: "running",
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();

  if (insertErr) {
    log.warn("Failed to insert cron_run_log row", { cronName, error: insertErr.message });
  }

  try {
    const result = await handler();
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - startedAt.getTime();

    // Determine status: 'ok' if no failure counters, 'partial' if any
    // failure field is > 0 (convention used by existing crons which
    // report {failed, errored} in their stats)
    const stats = result.stats || {};
    const failureCount = (
      (stats.failed as number | undefined) ||
      (stats.errored as number | undefined) ||
      0
    );
    const status = failureCount > 0 ? "partial" : "ok";

    if (logRow) {
      await supabase
        .from("cron_run_log")
        .update({
          ended_at: endedAt.toISOString(),
          duration_ms: durationMs,
          status,
          stats,
        })
        .eq("id", logRow.id);
    }

    return result.response;
  } catch (err) {
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - startedAt.getTime();
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (logRow) {
      await supabase
        .from("cron_run_log")
        .update({
          ended_at: endedAt.toISOString(),
          duration_ms: durationMs,
          status: "error",
          error_message: errorMessage.slice(0, 500),
        })
        .eq("id", logRow.id);
    }

    log.error("Cron handler threw", { cronName, error: errorMessage });
    throw err;
  }
}

/**
 * Drop-in handler wrapper so existing cron routes can add run-log
 * tracking with a one-line change:
 *
 *     // Before
 *     export async function GET(req: NextRequest) { ...body... }
 *
 *     // After
 *     async function handler(req: NextRequest) { ...body... }
 *     export const GET = wrapCronHandler("my-cron", handler);
 *
 * The wrapper clones the response, parses its JSON body to extract
 * stats for the log row, and auto-detects admin-manual triggers via
 * the X-Admin-Manual header.
 */
export function wrapCronHandler(
  cronName: string,
  handler: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const triggeredBy: "cron" | "admin_manual" = req.headers.get("x-admin-manual")
      ? "admin_manual"
      : "cron";

    return withCronRunLog(
      cronName,
      async () => {
        const response = await handler(req);
        // Clone + parse body to extract stats. If the handler returned
        // a non-JSON or non-successful response we still log but with
        // empty stats.
        let stats: Record<string, unknown> = {};
        try {
          const bodyText = await response.clone().text();
          if (bodyText) {
            const parsed = JSON.parse(bodyText);
            if (parsed && typeof parsed === "object") {
              stats = parsed as Record<string, unknown>;
            }
          }
        } catch {
          // non-JSON response, no stats
        }
        return { response, stats };
      },
      { triggeredBy },
    );
  };
}

/**
 * Clean up cron_run_log rows older than 90 days. Called by a separate
 * cleanup cron so we don't block real crons on maintenance work.
 */
export async function cleanupCronRunLog(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("cron_run_log")
    .delete({ count: "exact" })
    .lt("started_at", cutoff);
  if (error) {
    log.error("cron_run_log cleanup failed", { error: error.message });
    return 0;
  }
  return count || 0;
}
