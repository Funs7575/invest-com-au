import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

const log = logger("cron-content-freshness");

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Cron: Content freshness checker
 *
 * Weekly. Finds published articles whose updated_at is older than
 * six months, inserts each into content_calendar with
 * priority='review_needed' (idempotent on article_id) so the
 * editorial team has a ranked queue of freshness work.
 *
 * A digest email is fired via Resend if RESEND_API_KEY +
 * LEADS_NOTIFY_EMAIL are configured. Otherwise the queue itself is
 * the signal.
 */

const STALE_DAYS = 180;

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const cutoff = new Date(
    Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: stale, error } = await supabase
    .from("articles")
    .select("id, slug, title, category, updated_at")
    .eq("status", "published")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(200);

  if (error) {
    log.error("select_failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = stale ?? [];
  let queued = 0;

  for (const a of rows as Array<{
    id: number;
    slug: string;
    title: string;
    category: string | null;
    updated_at: string | null;
  }>) {
    // Skip if there's already an open review task for this article.
    const { data: existing } = await supabase
      .from("content_calendar")
      .select("id, status")
      .eq("article_id", a.id)
      .in("status", ["planned", "in_progress"])
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error: insertErr } = await supabase.from("content_calendar").insert({
      title: `[Refresh] ${a.title}`,
      article_id: a.id,
      category: a.category,
      priority: "review_needed",
      article_type: "refresh",
      status: "planned",
      notes: `Auto-queued by content-freshness cron. Last updated: ${a.updated_at}`,
    });
    if (!insertErr) {
      queued++;
      // Audit-trail log — separate from the active work queue above.
      // Unresolved rows here indicate freshness work not yet completed.
      await supabase.from("content_freshness_log").insert({
        article_id: a.id,
        reason: `Published article older than ${STALE_DAYS} days (last updated ${a.updated_at ?? "unknown"})`,
        resolved: false,
      });
    }
  }

  // Fire-and-forget digest email
  if (queued > 0) {
    void notifyAdmin(queued).catch((err) =>
      log.warn("admin_notify_failed", { err: String(err) }),
    );
  }

  log.info("freshness_run_complete", { stale: rows.length, queued });

  return NextResponse.json({
    ok: true,
    stale_found: rows.length,
    newly_queued: queued,
  });
}

async function notifyAdmin(queued: number): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (!key || !to) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "cron@invest.com.au",
      to: [to],
      subject: `Content freshness — ${queued} articles queued for review`,
      html: `
        <h2>Content freshness digest</h2>
        <p>${queued} articles older than ${STALE_DAYS} days have been
        added to the content_calendar review queue.</p>
        <p>Review in <a href="https://invest.com.au/admin/content-calendar">/admin/content-calendar</a>.</p>
      `,
    }),
  });
}
