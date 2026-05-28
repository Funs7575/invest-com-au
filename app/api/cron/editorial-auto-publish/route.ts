import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { wrapCronHandler } from "@/lib/cron-run-log";

export const runtime = "nodejs";
export const maxDuration = 30;

const log = logger("cron:editorial-auto-publish");

// Promotes editorial_articles from 'review_passed' → 'published' once the
// 4-hour Fin no-objection window has elapsed and `fin_objection_at IS NULL`.
//
// Spec: .claude/agents/04-editorial.md (Tier 2 auto-publish pass — "every
// 15 minutes" cron). Companion to the Fin-only objection write path at
// `app/api/admin/fin-objection/[id]/route.ts`. The objection-event flow that
// raises `agent_tasks` rows on fin_objection_at transitions is separate
// (event-driven, not handled here).
//
// Pre-launch (AFSL pending), Tier 2 content publishes under the
// "invest.com.au Research Team" byline only; Tier 1 pillar articles stay
// out of this auto-promote loop and require a `ceo_approvals` gate.
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  // The index `idx_editorial_articles_auto_publish` (migration 20260521)
  // is exactly this predicate minus the review_passed_at filter; PG picks
  // it up and a small B-tree scan settles the rest.
  const { data: rows, error: selectErr } = await supabase
    .from("editorial_articles")
    .select("id, slug, title, tier, review_passed_at")
    .eq("status", "review_passed")
    .is("fin_objection_at", null)
    .lte("review_passed_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    .eq("tier", 2);

  if (selectErr) {
    log.error("select review_passed rows failed", { err: selectErr.message });
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ checked: 0, published: 0, startedAt });
  }

  const published: { id: string; slug: string | null; title: string }[] = [];
  const failed: { id: string; err: string }[] = [];

  for (const row of rows) {
    // Conditional update: re-check the guards inside the UPDATE so a Fin
    // objection that lands mid-loop wins. Without the WHERE refinement,
    // a fin_objection_at write in the same second as our SELECT would be
    // silently overwritten by the publish.
    const { data: updated, error: updateErr } = await supabase
      .from("editorial_articles")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "review_passed")
      .is("fin_objection_at", null)
      .select("id")
      .maybeSingle();

    if (updateErr) {
      failed.push({ id: row.id, err: updateErr.message });
      log.error("publish update failed", { id: row.id, err: updateErr.message });
      continue;
    }

    if (!updated) {
      // Lost the race — Fin objected (or status changed) between SELECT and
      // UPDATE. Quiet skip; the event-driven objection handler picks it up.
      continue;
    }

    published.push({ id: row.id, slug: row.slug, title: row.title });
  }

  log.info("editorial auto-publish complete", {
    candidates: rows.length,
    published: published.length,
    failed: failed.length,
  });

  return NextResponse.json({
    startedAt,
    candidates: rows.length,
    published: published.length,
    publishedRows: published,
    failed: failed.length,
    failedRows: failed,
  });
}

export const GET = wrapCronHandler("editorial-auto-publish", handler);
