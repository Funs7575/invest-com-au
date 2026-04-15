import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTmd } from "@/lib/tmds";
import { logger } from "@/lib/logger";

const log = logger("cron-tmd-audit");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: TMD coverage audit.
 *
 * Runs daily at 06:00 AEST. For every active broker we distribute,
 * check whether a current (non-expired) TMD is on file via
 * `getCurrentTmd`. Missing or expired TMDs are written to
 * data_integrity_issues with severity='critical' so compliance
 * sees them in the admin data-health surface on next refresh.
 *
 * This is the enforcement layer for DDO s994A–C. The broker page
 * won't stop rendering when a TMD is missing — the product page
 * just shows no badge — but this cron guarantees compliance is
 * paged so nothing sits broken for weeks.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  const { data: brokers, error } = await supabase
    .from("brokers")
    .select("slug, name, status")
    .eq("status", "active");

  if (error) {
    log.error("broker fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const missing: Array<{ slug: string; name: string }> = [];
  for (const b of (brokers as { slug: string; name: string }[] | null) || []) {
    const tmd = await getCurrentTmd("broker", b.slug);
    if (!tmd) missing.push(b);
  }

  // Upsert a single data_integrity_issues row summarising the gap.
  // Keyed by check_name so repeat runs update last_seen_at rather
  // than piling up duplicates.
  if (missing.length > 0) {
    try {
      await supabase.from("data_integrity_issues").upsert(
        {
          check_name: "broker_tmd_coverage",
          issue_count: missing.length,
          severity: "critical",
          sample_ids: missing.slice(0, 20).map((m) => m.slug),
          description: `${missing.length} active broker(s) are missing a current TMD — DDO s994A requires one on every product page.`,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "check_name" },
      );
    } catch (err) {
      log.warn("data_integrity_issues upsert failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
    log.warn("broker TMD coverage gap", {
      missing_count: missing.length,
      sample: missing.slice(0, 5).map((m) => m.slug),
    });
  } else {
    // Clear any previous issue row — coverage is complete again.
    try {
      await supabase
        .from("data_integrity_issues")
        .update({ resolved_at: new Date().toISOString() })
        .eq("check_name", "broker_tmd_coverage")
        .is("resolved_at", null);
    } catch {
      /* non-blocking */
    }
  }

  return NextResponse.json({
    ok: true,
    checked: brokers?.length || 0,
    missing_count: missing.length,
    sample: missing.slice(0, 10).map((m) => m.slug),
  });
}

export const GET = wrapCronHandler("tmd-audit", handler);
