import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { computeUserHealthScore, type HealthScoreInput } from "@/lib/user-health-score";
import { computeCurrentStreak } from "@/lib/streak";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = logger("cron:user-health-score-email");

// Monthly cron — computes each user's health score, stores the snapshot,
// and emails users whose weekly_digest preference is enabled.
// Idempotent: upserts on (user_id, scored_month).

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("user-health-score-email", async () => {
    const admin = createAdminClient();
    const siteUrl = getSiteUrl();
    const now = new Date();
    const scoredMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
    const todayIso = now.toISOString().slice(0, 10);

    // ── Load all users with weekly_digest ────────────────────────────────────
    const { data: prefRows } = await admin
      .from("notification_preferences")
      .select("user_id, weekly_digest")
      .eq("weekly_digest", true);

    const userIds = (prefRows ?? []).map((r) => r.user_id as string);
    if (userIds.length === 0) {
      return { response: NextResponse.json({ ok: true, sent: 0, scored: 0 }), stats: { sent: 0 } };
    }

    // ── Bulk load all needed data ────────────────────────────────────────────
    const [
      { data: allHoldings },
      { data: allProfiles },
      { data: allGoals },
      { data: allShortlisted },
      { data: allCheckins },
      { data: allPrevScores },
    ] = await Promise.all([
      admin.from("investor_holdings").select("auth_user_id, exchange, cost_basis_per_share_cents, shares").in("auth_user_id", userIds),
      admin.from("investor_profiles").select("auth_user_id, experience_level").in("auth_user_id", userIds),
      admin.from("investor_goals").select("auth_user_id, target_cents, current_balance_cents").in("auth_user_id", userIds),
      admin.from("user_shortlisted_brokers").select("user_id, broker_slug").in("user_id", userIds),
      admin.from("user_daily_checkins").select("user_id, check_in_date, streak_count").in("user_id", userIds).gte("check_in_date", thirtyDaysAgo),
      admin.from("user_health_score_log").select("user_id, overall, scored_month").in("user_id", userIds).order("scored_month", { ascending: false }).limit(userIds.length * 2),
    ]);

    // Get broker fee data
    const allBrokerSlugs = [...new Set((allShortlisted ?? []).map((b) => b.broker_slug))];
    const { data: brokerFeeData } = allBrokerSlugs.length
      ? await admin.from("brokers").select("slug, asx_fee_value").in("slug", allBrokerSlugs).eq("status", "active")
      : { data: null };
    const feeBySlug = new Map((brokerFeeData ?? []).map((b) => [b.slug, Number(b.asx_fee_value ?? 30)]));

    // Get emails
    const { data: authUsersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailByUserId = new Map((authUsersPage?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!]));

    // Index by user
    const holdingsByUser = new Map<string, typeof allHoldings>(); for (const h of allHoldings ?? []) { const uid = h.auth_user_id; if (!holdingsByUser.has(uid)) holdingsByUser.set(uid, []); holdingsByUser.get(uid)!.push(h); }
    const profileByUser = new Map((allProfiles ?? []).map((p) => [p.auth_user_id, p]));
    const goalsByUser = new Map<string, typeof allGoals>(); for (const g of allGoals ?? []) { const uid = g.auth_user_id; if (!goalsByUser.has(uid)) goalsByUser.set(uid, []); goalsByUser.get(uid)!.push(g); }
    const shortByUser = new Map<string, string[]>(); for (const s of allShortlisted ?? []) { if (!shortByUser.has(s.user_id)) shortByUser.set(s.user_id, []); shortByUser.get(s.user_id)!.push(s.broker_slug); }
    const checkinsByUser = new Map<string, { check_in_date: string; streak_count: number }[]>(); for (const c of allCheckins ?? []) { const uid = c.user_id; if (!checkinsByUser.has(uid)) checkinsByUser.set(uid, []); checkinsByUser.get(uid)!.push(c as { check_in_date: string; streak_count: number }); }
    const prevByUser = new Map<string, number>(); for (const p of allPrevScores ?? []) { if (!prevByUser.has(p.user_id)) prevByUser.set(p.user_id, (p as { overall: number }).overall); }

    let sent = 0;
    let scored = 0;
    const upsertRows: {
      user_id: string; overall: number; diversification: number; cost: number;
      risk_alignment: number; engagement: number; scored_month: string;
    }[] = [];

    for (const userId of userIds) {
      const holdings = holdingsByUser.get(userId) ?? [];
      const profile = profileByUser.get(userId);
      const goals = goalsByUser.get(userId) ?? [];
      const slugs = shortByUser.get(userId) ?? [];
      const checkins = checkinsByUser.get(userId) ?? [];

      const holdingCount = holdings.length;
      const distinctExchanges = new Set(holdings.map((h) => h.exchange).filter(Boolean)).size;
      let maxConcentrationPct = 0;
      if (holdingCount > 0) {
        const total = holdings.reduce((s, h) => s + Number(h.cost_basis_per_share_cents ?? 0) * Number(h.shares ?? 0), 0);
        if (total > 0) {
          maxConcentrationPct = Math.round(Math.max(...holdings.map((h) => Number(h.cost_basis_per_share_cents ?? 0) * Number(h.shares ?? 0))) / total * 100);
        }
      }

      let avgFeeScore: number | null = null;
      if (slugs.length > 0) {
        const fees = slugs.map((s) => feeBySlug.get(s) ?? 30);
        const avg = fees.reduce((a, b) => a + b, 0) / fees.length;
        avgFeeScore = Math.round(Math.max(0, 100 - (avg / 30) * 100));
      }

      const hasGoals = goals.length > 0;
      const progresses = goals.filter((g) => g.target_cents && Number(g.target_cents) > 0).map((g) => Math.min(100, Math.round(Number(g.current_balance_cents ?? 0) / Number(g.target_cents!) * 100)));
      const goalProgressPct = progresses.length > 0 ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : null;

      const currentStreak = computeCurrentStreak(checkins, todayIso);

      const input: HealthScoreInput = {
        holdingCount, distinctExchanges, maxConcentrationPct, avgFeeScore,
        experienceLevel: (profile?.experience_level as HealthScoreInput["experienceLevel"]) ?? null,
        hasGoals, goalProgressPct, activeCheckinsLast30d: checkins.length, currentStreak,
      };

      const s = computeUserHealthScore(input);
      upsertRows.push({ user_id: userId, overall: s.overall, diversification: s.diversification, cost: s.cost, risk_alignment: s.riskAlignment, engagement: s.engagement, scored_month: scoredMonth });
      scored++;

      const email = emailByUserId.get(userId);
      if (!email) continue;

      const prev = prevByUser.get(userId);
      const delta = prev !== undefined ? s.overall - prev : null;
      const deltaStr = delta !== null ? ` (${delta > 0 ? "+" : ""}${delta} vs last month)` : "";
      const grade = s.grade;

      const html = `
        <p>Hi,</p>
        <p>Your monthly investing health score is ready: <strong>${grade} — ${s.overall}/100</strong>${deltaStr}.</p>
        <table style="border-collapse:collapse;margin:16px 0;font-size:13px">
          <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Diversification</td><td style="font-weight:600">${s.diversification}/100</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Cost efficiency</td><td style="font-weight:600">${s.cost}/100</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Risk alignment</td><td style="font-weight:600">${s.riskAlignment}/100</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Engagement</td><td style="font-weight:600">${s.engagement}/100</td></tr>
        </table>
        <p><a href="${siteUrl}/account/health" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View full score →</a></p>
        <p style="font-size:11px;color:#9ca3af;margin-top:24px">
          General information only — not financial advice. Factual summary of your own data only.
          <a href="${siteUrl}/account/notifications" style="color:#9ca3af">Manage email preferences</a>
        </p>
      `;

      try {
        await sendEmail({ to: email, subject: `Your investing health score: ${grade} (${s.overall}/100)${deltaStr}`, html });
        sent++;
      } catch (err) {
        log.warn("Failed to send health score email", { userId, error: String(err) });
      }
    }

    // Upsert score log
    if (upsertRows.length > 0) {
      await admin.from("user_health_score_log").upsert(upsertRows, { onConflict: "user_id,scored_month", ignoreDuplicates: false });
    }

    log.info("Health score email complete", { sent, scored });
    return { response: NextResponse.json({ ok: true, sent, scored }), stats: { sent, scored } };
  }, { triggeredBy: req.headers.get("x-admin-manual") ? "admin_manual" : "cron" });
}
