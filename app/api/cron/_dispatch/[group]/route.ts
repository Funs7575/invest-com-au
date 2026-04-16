import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { CRON_GROUPS } from "@/lib/cron-groups";
import { logger } from "@/lib/logger";

const log = logger("cron-dispatch");

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/_dispatch/[group]
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

  const origin = new URL(req.url).origin;
  const auth = req.headers.get("authorization") ?? "";

  const started = Date.now();
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const t0 = Date.now();
      const res = await fetch(`${origin}${path}`, {
        method: "GET",
        headers: { Authorization: auth },
        cache: "no-store",
      });
      const durationMs = Date.now() - t0;
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // handler returned non-JSON; ignore body, status is what we log
      }
      return { path, status: res.status, durationMs, body };
    }),
  );

  const summary = results.map((r, i) => {
    const path = paths[i];
    if (r.status === "fulfilled") {
      return { ok: r.value.status < 400, ...r.value };
    }
    return {
      path,
      ok: false,
      error:
        r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const failed = summary.filter((s) => !s.ok);
  log.info("Dispatch complete", {
    group,
    total: summary.length,
    failed: failed.length,
    totalMs: Date.now() - started,
  });

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
