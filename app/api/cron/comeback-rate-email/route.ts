import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:comeback-rate-email");

// Daily cron — finds users whose last-seen rate for a savings/TD product
// has since changed, and sends a personalised email with the actual move.
// Idempotent: skips if notified_rate_bps already equals the current rate.
// Cooldown: 7 days between emails per product (notified_at guard).

interface MemoryRow {
  id: string;
  user_id: string;
  broker_id: number;
  broker_slug: string;
  broker_name: string;
  product_kind: string;
  last_seen_rate_bps: number;
  notified_rate_bps: number | null;
  notified_at: string | null;
  current_rate_bps: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("comeback-rate-email", async () => {
    const admin = createAdminClient();
    const now = new Date();

    // ── 1. Latest rate per broker+product_kind ───────────────────────────────
    const { data: snapshots } = await admin
      .from("savings_rate_snapshots")
      .select("broker_id, product_kind, rate_bps, captured_at")
      .order("captured_at", { ascending: false });

    if (!snapshots || snapshots.length === 0) {
      log.info("No snapshots available");
      return { response: NextResponse.json({ ok: true, sent: 0, reason: "no_snapshots" }), stats: { sent: 0 } };
    }

    // Best (highest) rate per broker+product_kind
    const bestRateMap = new Map<string, number>();
    for (const s of snapshots) {
      const key = `${s.broker_id}:${s.product_kind}`;
      if (!bestRateMap.has(key)) bestRateMap.set(key, s.rate_bps);
    }

    // ── 2. Load rate memory rows ─────────────────────────────────────────────
    const { data: memoryRows } = await admin
      .from("user_rate_memory")
      .select("id, user_id, broker_id, product_kind, last_seen_rate_bps, notified_rate_bps, notified_at, brokers!inner(slug, name)")
      .limit(500);

    if (!memoryRows || memoryRows.length === 0) {
      log.info("No rate memory rows");
      return { response: NextResponse.json({ ok: true, sent: 0 }), stats: { sent: 0 } };
    }

    const cooldownCutoff = new Date(now.getTime() - 7 * 86_400_000).toISOString();

    const candidates: MemoryRow[] = (memoryRows as unknown as Array<{
      id: string; user_id: string; broker_id: number; product_kind: string;
      last_seen_rate_bps: number; notified_rate_bps: number | null; notified_at: string | null;
      brokers: { slug: string; name: string };
    }>).filter((r) => {
      const key = `${r.broker_id}:${r.product_kind}`;
      const currentBps = bestRateMap.get(key);
      if (!currentBps) return false;
      if (currentBps === r.last_seen_rate_bps) return false;
      if (r.notified_rate_bps === currentBps) return false;
      if (r.notified_at && r.notified_at > cooldownCutoff) return false;
      return true;
    }).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      broker_id: r.broker_id,
      broker_slug: r.brokers.slug,
      broker_name: r.brokers.name,
      product_kind: r.product_kind,
      last_seen_rate_bps: r.last_seen_rate_bps,
      notified_rate_bps: r.notified_rate_bps,
      notified_at: r.notified_at,
      current_rate_bps: bestRateMap.get(`${r.broker_id}:${r.product_kind}`)!,
    }));

    if (candidates.length === 0) {
      log.info("No rate changes to notify");
      return { response: NextResponse.json({ ok: true, sent: 0 }), stats: { sent: 0 } };
    }

    // ── 3. Resolve emails + check deal_alerts preference ─────────────────────
    const userIds = [...new Set(candidates.map((c) => c.user_id))];
    const { data: authUsersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailByUserId = new Map<string, string>();
    for (const u of authUsersPage?.users ?? []) {
      if (u.email && userIds.includes(u.id)) emailByUserId.set(u.id, u.email);
    }

    const { data: prefRows } = await admin
      .from("notification_preferences")
      .select("user_id, deal_alerts")
      .in("user_id", userIds);

    const optedOut = new Set(
      (prefRows ?? []).filter((p) => p.deal_alerts === false).map((p) => p.user_id),
    );

    // ── 4. Send emails ────────────────────────────────────────────────────────
    const siteUrl = getSiteUrl();
    let sent = 0;
    const updateIds: { id: string; current_rate_bps: number }[] = [];

    for (const c of candidates) {
      const email = emailByUserId.get(c.user_id);
      if (!email || optedOut.has(c.user_id)) continue;

      const moved = c.current_rate_bps - c.last_seen_rate_bps;
      const isUp = moved > 0;
      const arrow = isUp ? "↑" : "↓";
      const newPct = (c.current_rate_bps / 100).toFixed(2) + "%";
      const oldPct = (c.last_seen_rate_bps / 100).toFixed(2) + "%";
      const movePct = (Math.abs(moved) / 100).toFixed(2) + "%";
      const productLabel = c.product_kind === "term_deposit" ? "term deposit" : "savings account";
      const brokerPath = `${siteUrl}/broker/${c.broker_slug}`;

      const subject = `${arrow} ${c.broker_name} rate ${isUp ? "increased" : "decreased"} to ${newPct} p.a.`;
      const html = `
        <p>Hi,</p>
        <p>The rate on the <strong>${c.broker_name}</strong> ${productLabel} has changed since your last visit.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Your last visit</td><td style="padding:4px 0;font-weight:600">${oldPct} p.a.</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Current rate</td><td style="padding:4px 0;font-weight:700;color:${isUp ? "#16a34a" : "#dc2626"}">${arrow} ${newPct} p.a.</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Change</td><td style="padding:4px 0;color:${isUp ? "#16a34a" : "#dc2626"}">${isUp ? "+" : "-"}${movePct}</td></tr>
        </table>
        <p><a href="${brokerPath}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View ${c.broker_name}</a></p>
        <p style="font-size:11px;color:#9ca3af;margin-top:24px">
          General information only. Rates and offers change — always verify directly with the provider before making any financial decision.
          <a href="${siteUrl}/account/notifications" style="color:#9ca3af">Manage email preferences</a>
        </p>
      `;

      try {
        await sendEmail({ to: email, subject, html });
        sent++;
        updateIds.push({ id: c.id, current_rate_bps: c.current_rate_bps });
      } catch (err) {
        log.warn("Failed to send comeback email", { userId: c.user_id, broker: c.broker_slug, error: String(err) });
      }
    }

    // ── 5. Mark notified ─────────────────────────────────────────────────────
    for (const { id, current_rate_bps } of updateIds) {
      await admin
        .from("user_rate_memory")
        .update({ notified_rate_bps: current_rate_bps, notified_at: now.toISOString() })
        .eq("id", id);
    }

    log.info("Comeback rate email complete", { sent, candidates: candidates.length });
    return { response: NextResponse.json({ ok: true, sent, candidates: candidates.length }), stats: { sent } };
  }, { triggeredBy: req.headers.get("x-admin-manual") ? "admin_manual" : "cron" });
}
