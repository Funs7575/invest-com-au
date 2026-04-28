import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { CRON_GROUPS } from "@/lib/cron-groups";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

const log = logger("cron-dispatch");

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/dispatch/[group]
 *
 * Fan-out dispatcher. Vercel triggers this per schedule in vercel.json;
 * the group slug maps to one or more individual handler paths in
 * CRON_GROUPS. Each handler is invoked over the loopback with the
 * original Authorization header so the per-handler CRON_SECRET check
 * still guards the real work.
 *
 * Existence rationale: Vercel's 40-cron-per-project cap. We have 62
 * handlers; this file collapses them to 39 schedule entries with zero
 * behavioural change to any handler.
 *
 * IMPORTANT: This folder must NOT start with `_`. Next.js app router
 * treats `_*` folders as private folders and refuses to register them
 * as routes. The original dispatcher (commit 0e27a308, 2026-04-16)
 * lived at `_dispatch/[group]` and was therefore never registered —
 * Vercel cron requests fell through to middleware which returned an
 * empty 200 with no body. That hid a 12-day cron blackout that PRs
 * #225, #231, and #238 instrumented around but never fixed at the
 * routing layer.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const { group } = await params;
  const paths = CRON_GROUPS[group];
  if (!paths) {
    log.warn("Unknown cron group", { group });
    return NextResponse.json(
      { error: `Unknown cron group: ${group}` },
      { status: 404 },
    );
  }

  // Loop back through the production alias, NOT `req.url`'s origin.
  //
  // Vercel cron fires against the unique deployment URL
  // (`invest-com-XXXX-finns-projects-…vercel.app`), which has Vercel's
  // Deployment Protection enabled — that layer returns an HTML 401
  // "Authentication Required" page BEFORE proxy.ts runs, so loopback
  // fetches never reach the route handler. Curl confirms: unique URL →
  // HTML 401 (Vercel auth wall), production alias → JSON 401 from
  // proxy.ts. Vercel automatically populates VERCEL_PROJECT_PRODUCTION_URL
  // with the protection-free production alias, so we use that.
  //
  // Falls back to `req.url`'s origin for local `npm run dev` where the
  // env var is unset.
  const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : new URL(req.url).origin;
  // Build Authorization from CRON_SECRET directly so the outbound header
  // is canonical regardless of header-rewrite/strip behaviour on the
  // round-trip. The inbound request is still validated by
  // `requireCronAuth(req)` above.
  const auth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : "";
  const supabase = createAdminClient();

  const started = Date.now();
  log.info("Dispatch start", { group, total: paths.length, origin });

  // ─────────────────────────────────────────────────────────────
  // Diagnostic write at function entry to definitively prove the
  // dispatcher route handler is executing. Without this, we can't
  // distinguish between "Vercel served a cached 200 without
  // running the route" and "route ran but its writes silently
  // failed". Distinct `name` + `triggered_by` so it doesn't
  // pollute real cron-health dashboards. Awaited (not
  // fire-and-forget) so we can capture the error if it fails.
  //
  // Once the cron silence is conclusively diagnosed (Sprint 1
  // close-out), this entry-write is removed in a follow-up PR.
  // Tracked as cleanup in queue stream L.
  // ─────────────────────────────────────────────────────────────
  const { error: diagErr } = await supabase
    .from("cron_run_log")
    .insert({
      name: `_diagnostic:${group}`,
      started_at: new Date().toISOString(),
      status: "ok",
      duration_ms: 0,
      triggered_by: "dispatcher",
      stats: { commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local", origin, paths_count: paths.length },
    });
  if (diagErr) {
    log.error("DIAGNOSTIC_ENTRY_INSERT_FAILED", {
      group,
      err: diagErr,
      message: diagErr.message,
      code: diagErr.code,
    });
  }

  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const t0 = Date.now();
      // Open a cron_run_log row before the call so a hanging handler
      // still shows up as "running" in the observability dashboard.
      // We surface insert failures explicitly — silent failures here
      // were the root cause of the 2026-04-16 → 2026-04-26 cron-log
      // silence (P0-1).
      const { data: logRow, error: insertErr } = await supabase
        .from("cron_run_log")
        .insert({
          name: path,
          started_at: new Date(t0).toISOString(),
          status: "running",
          triggered_by: "dispatcher",
        })
        .select("id")
        .single();

      if (insertErr) {
        log.error("cron_run_log insert failed", {
          path,
          err: insertErr,
          message: insertErr.message,
          code: insertErr.code,
        });
      }

      let status = 0;
      let body: unknown = null;
      let errorMessage: string | null = null;
      let fetchSucceeded = false;
      try {
        const res = await fetch(`${origin}${path}`, {
          method: "GET",
          headers: { Authorization: auth },
          cache: "no-store",
        });
        status = res.status;
        fetchSucceeded = true;
        try {
          body = await res.json();
        } catch {
          // handler returned non-JSON; ignore body, status is what we log
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        log.error("loopback fetch threw", {
          path,
          err: err instanceof Error ? err : undefined,
          message: errorMessage,
        });
      }
      const durationMs = Date.now() - t0;

      // A loopback fetch that throws (e.g., DNS / TLS / connection
      // reset) leaves `status === 0`. Without this guard, the
      // summary at the bottom treats `0 < 400` as success and
      // dispatcher returns 200 even though every handler failed —
      // which is exactly what masked the 10-day cron silence in
      // 2026-04. Treat any non-fulfilled fetch as failure.
      const handlerFailed = !fetchSucceeded || status >= 400;

      if (handlerFailed) {
        log.error("handler invocation failed", {
          path,
          status,
          fetchSucceeded,
          message: errorMessage ?? `HTTP ${status}`,
          durationMs,
        });
      }

      // Close the row with the outcome. If the insert earlier failed
      // we silently drop the update — the dispatcher summary below is
      // still accurate.
      if (logRow) {
        const { error: updateErr } = await supabase
          .from("cron_run_log")
          .update({
            ended_at: new Date().toISOString(),
            duration_ms: durationMs,
            // Status MUST be one of ('running','ok','error','partial')
            // per the cron_run_log_status_check CHECK constraint
            // (verified live 2026-04-26). The pre-fix dispatcher
            // wrote 'success' here — the constraint silently rejected
            // every UPDATE, which is the deepest layer of the
            // 04-16 → 04-26 logging silence. 'ok' matches the value
            // wrapCronHandler uses on the handler-side path so the
            // observability dashboard groups both sources under one
            // bucket.
            status: handlerFailed ? "error" : "ok",
            error_message:
              errorMessage ?? (status >= 400 ? `HTTP ${status}` : null),
            stats: isPlainObject(body) ? body : null,
          })
          .eq("id", logRow.id);

        if (updateErr) {
          log.error("cron_run_log update failed", {
            path,
            logRowId: logRow.id,
            err: updateErr,
            message: updateErr.message,
          });
        }
      }

      return { path, status, durationMs, body, errorMessage, handlerFailed };
    }),
  );

  const summary = results.map((r, i) => {
    const path = paths[i];
    if (r.status === "fulfilled") {
      // `handlerFailed` is the authoritative success/failure flag —
      // it's true when the loopback fetch threw OR returned >=400.
      // Pre-fix code used `status < 400` which incorrectly classified
      // `status === 0` (fetch never returned) as success.
      return { ok: !r.value.handlerFailed, ...r.value };
    }
    return {
      path,
      ok: false,
      error:
        r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const failed = summary.filter((s) => !s.ok);
  if (failed.length > 0) {
    log.error("Dispatch complete with failures", {
      group,
      total: summary.length,
      failed: failed.length,
      totalMs: Date.now() - started,
      // First 3 failed paths for triage; full set in summary response
      failedPaths: failed.slice(0, 3).map((f) => f.path),
    });
  } else {
    log.info("Dispatch complete", {
      group,
      total: summary.length,
      failed: 0,
      totalMs: Date.now() - started,
    });
  }

  return NextResponse.json(
    {
      ok: failed.length === 0,
      group,
      total: summary.length,
      failed: failed.length,
      results: summary,
    },
    { status: failed.length === 0 ? 200 : 207 },
  );
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
