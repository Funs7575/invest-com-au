/**
 * Cron: Unfinished-business weekly digest — Fridays at 07:00 UTC (5pm AEST).
 *
 * For each user with weekly_digest enabled who has open decision-inbox
 * items: sends a summary email listing high-urgency items first.
 *
 * Uses buildDecisionInbox() from lib/decision-inbox.ts — the same
 * function that renders /account/decisions — so the email always matches
 * what the user sees in the dashboard.
 *
 * Deduplication: decisions_digest_sends (user_id, send_date UNIQUE).
 * Skips sends when the inbox is empty (nothing to remind about).
 * Batched 5-at-a-time with 200ms pauses, capped at 100 per run.
 *
 * Tied to the existing weekly_digest preference (not a new opt-in) so
 * users who already get the Monday performance digest also get this
 * Friday unfinished-business wrap-up.
 */

import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/html-escape";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";
import {
  buildDecisionInbox,
  type DecisionItem,
  type GoalDbRow,
  type RateMemoryRow,
} from "@/lib/decision-inbox";
import type { ActionPlan } from "@/lib/getmatched/types";
import type { SavedSearchRow } from "@/lib/saved-searches";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("decisions-digest");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";


export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("decisions-digest", async () => {
    const supabase = createAdminClient();
    const today = new Date();
    const sendDate = today.toISOString().slice(0, 10);
    const dateStr = today.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    // ── Opted-in users (weekly_digest pref) ──────────────────────────────────

    const { data: prefUsers, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("weekly_digest", true);

    if (prefError) {
      log.error("Failed to fetch weekly_digest prefs", { error: prefError.message });
      return {
        response: NextResponse.json({ error: prefError.message }, { status: 500 }),
        stats: { sent: 0, errors: 1 },
      };
    }

    if (!prefUsers || prefUsers.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No opted-in users" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    const allIds = prefUsers.map((u) => u.user_id as string);

    // ── Dedup ─────────────────────────────────────────────────────────────────

    const { data: alreadySent } = await supabase
      .from("decisions_digest_sends")
      .select("user_id")
      .eq("send_date", sendDate);

    const sentSet = new Set((alreadySent ?? []).map((s) => s.user_id as string));
    const pendingIds = allIds.filter((id) => !sentSet.has(id)).slice(0, 100);

    if (pendingIds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "All users already received digest today" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    // ── Auth emails ───────────────────────────────────────────────────────────

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // ── Per-user data + send ─────────────────────────────────────────────────

    let sent = 0;
    let errors = 0;
    const BATCH = 5;

    for (let i = 0; i < pendingIds.length; i += BATCH) {
      const batch = pendingIds.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async (userId) => {
          const email = emailMap.get(userId);
          if (!email) return;

          // Fetch all data sources in parallel
          const [goalsRes, plansRes, searchesRes, rateMemRes] = await Promise.allSettled([
            supabase
              .from("investor_goals")
              .select(
                "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct",
              )
              .eq("auth_user_id", userId)
              .order("target_date", { ascending: true }),

            supabase
              .from("get_matched_action_plans")
              .select("*")
              .eq("auth_user_id", userId)
              .not("status", "in", '("converted","expired")')
              .order("updated_at", { ascending: false })
              .limit(20),

            supabase
              .from("saved_searches")
              .select(
                "id, user_id, kind, label, filters, email_frequency, last_alerted_at, last_match_signature, created_at, updated_at",
              )
              .eq("user_id", userId)
              .order("created_at", { ascending: false }),

            supabase
              .from("user_rate_memory")
              .select(
                "id, broker_id, product_kind, last_seen_rate_bps, notified_rate_bps, notified_at, last_seen_at, brokers(name, slug)",
              )
              .eq("user_id", userId)
              .not("notified_rate_bps", "is", null),
          ]);

          const goalRows: GoalDbRow[] = goalsRes.status === "fulfilled"
            ? (goalsRes.value.data ?? []).map((r) => ({
                id: r.id as number,
                label: r.label as string,
                goal_type: r.goal_type as string,
                target_cents: Number(r.target_cents),
                target_date: r.target_date as string,
                current_balance_cents: Number(r.current_balance_cents),
                monthly_contribution_cents: Number(r.monthly_contribution_cents),
                expected_return_pct: Number(r.expected_return_pct),
              }))
            : [];

          const plans: ActionPlan[] =
            plansRes.status === "fulfilled" ? ((plansRes.value.data as ActionPlan[]) ?? []) : [];

          const searches: SavedSearchRow[] =
            searchesRes.status === "fulfilled"
              ? ((searchesRes.value.data as SavedSearchRow[]) ?? [])
              : [];

          const rateMemoryRows: RateMemoryRow[] = rateMemRes.status === "fulfilled"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (rateMemRes.value.data ?? []).map((r: any) => ({
                id: r.id as string,
                broker_id: r.broker_id as number,
                broker_name: r.brokers?.name ?? "Unknown",
                broker_slug: r.brokers?.slug ?? "",
                product_kind: r.product_kind as string,
                last_seen_rate_bps: r.last_seen_rate_bps as number,
                notified_rate_bps: r.notified_rate_bps as number | null,
                notified_at: r.notified_at as string | null,
                last_seen_at: r.last_seen_at as string,
              }))
            : [];

          const items = buildDecisionInbox(goalRows, plans, searches, rateMemoryRows);

          // Skip if nothing needs attention
          if (items.length === 0) return;

          const highCount = items.filter((x) => x.urgency === "high").length;
          const html = buildEmailHtml({ email, dateStr, items, highCount });
          const subjectCount = highCount > 0 ? `${highCount} urgent, ` : "";

          const result = await sendEmail({
            to: email,
            subject: `Your weekly wrap — ${subjectCount}${items.length} open item${items.length === 1 ? "" : "s"}`,
            html,
            from: "Invest.com.au <weekly@invest.com.au>",
          });

          if (!result.ok) throw new Error(result.error ?? "send failed");

          await supabase.from("decisions_digest_sends").insert({
            user_id: userId,
            send_date: sendDate,
            item_count: items.length,
            high_count: highCount,
          });
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else {
          errors++;
          log.warn("Decisions digest send failed", {
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          });
        }
      }

      if (i + BATCH < pendingIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    log.info("Decisions digest complete", {
      sent,
      errors,
      total: pendingIds.length,
      skipped: sentSet.size,
    });

    return {
      response: NextResponse.json({
        sent,
        errors,
        total_eligible: pendingIds.length,
        skipped_already_sent: sentSet.size,
        send_date: sendDate,
      }),
      stats: { sent, errors },
    };
  });
}

// ─── Email template ───────────────────────────────────────────────────────────

const URGENCY_BAR: Record<DecisionItem["urgency"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#94a3b8",
};

const KIND_EMOJI: Record<DecisionItem["kind"], string> = {
  goal: "🎯",
  plan: "📋",
  brief: "📨",
  saved_search: "🔔",
  rate_alert: "📊",
};

const BADGE_COLORS: Record<DecisionItem["badgeTone"], { bg: string; color: string }> = {
  red:   { bg: "#fef2f2", color: "#991b1b" },
  amber: { bg: "#fffbeb", color: "#92400e" },
  green: { bg: "#f0fdf4", color: "#166534" },
  blue:  { bg: "#eff6ff", color: "#1e40af" },
  slate: { bg: "#f8fafc", color: "#475569" },
};

function buildEmailHtml({
  email,
  dateStr,
  items,
  highCount,
}: {
  email: string;
  dateStr: string;
  items: DecisionItem[];
  highCount: number;
}): string {
  const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const heroText =
    highCount > 0
      ? `You have <strong>${highCount} item${highCount > 1 ? "s" : ""}</strong> that need${highCount === 1 ? "s" : ""} attention soon.`
      : `You have <strong>${items.length} open item${items.length > 1 ? "s" : ""}</strong> to stay on top of.`;

  const itemsHtml = items
    .map((item) => {
      const bar = URGENCY_BAR[item.urgency];
      const emoji = KIND_EMOJI[item.kind];
      const badge = BADGE_COLORS[item.badgeTone];
      const nextLine = item.nextAction
        ? `<p style="font-size:12px;color:#64748b;margin:4px 0 0;font-style:italic">→ ${escapeHtml(item.nextAction)}</p>`
        : "";
      const dueLabel = item.dueLabel
        ? `<span style="font-size:11px;color:#94a3b8;white-space:nowrap">${escapeHtml(item.dueLabel)}</span>`
        : "";

      return `<a href="${BASE_URL}${item.href}" style="display:block;text-decoration:none;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px 12px 18px;margin-bottom:8px;position:relative;overflow:hidden">
        <span style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${bar};display:block"></span>
        <table style="width:100%;border-collapse:collapse"><tr>
          <td style="vertical-align:top;width:28px;padding-right:10px;font-size:20px">${emoji}</td>
          <td style="vertical-align:top">
            <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 2px">${escapeHtml(item.title)}</p>
            <p style="font-size:12px;color:#64748b;margin:0">${escapeHtml(item.subtitle)}</p>
            ${nextLine}
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:8px">
            <span style="display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:2px 7px;border-radius:20px;background:${badge.bg};color:${badge.color}">${escapeHtml(item.badge)}</span>
            <br>${dueLabel}
          </td>
        </tr></table>
      </a>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:20px">
      <a href="${BASE_URL}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
      <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">Weekly Wrap &mdash; ${escapeHtml(dateStr)}</p>
    </div>

    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px">
      <h1 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 6px">Your open items this week</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 20px">${heroText} <a href="${BASE_URL}/account/decisions" style="color:#059669;font-weight:600;text-decoration:none">View full inbox →</a></p>

      ${itemsHtml}

      <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0">
        <a href="${BASE_URL}/account/decisions" style="display:inline-block;padding:10px 22px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">Go to decision inbox</a>
      </div>
    </div>

    <div style="text-align:center;padding:10px 0">
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px">General information only — not personal financial advice.</p>
      <a href="${unsubUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">Unsubscribe</a>
      <span style="color:#cbd5e1;margin:0 6px">&middot;</span>
      <a href="${BASE_URL}/account/alerts" style="font-size:11px;color:#94a3b8;text-decoration:underline">Manage preferences</a>
    </div>
  </div>
</body>
</html>`;
}
