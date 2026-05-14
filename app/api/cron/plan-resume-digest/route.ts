import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import {
  renderDigestEmail,
  shouldSkip,
  type DigestCandidate,
} from "@/lib/account/plan-resume-digest";

const log = logger("plan-resume-digest");

export const maxDuration = 60;

const DRAFT_AGE_DAYS = 3;
const DEDUP_WINDOW_DAYS = 7;

/**
 * Cron: daily nudge to users who started a Get Matched plan and
 * abandoned it >3 days ago. One email per user per 7 days.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

  const draftCutoff = new Date(
    Date.now() - DRAFT_AGE_DAYS * 86400_000,
  ).toISOString();
  const dedupCutoff = new Date(
    Date.now() - DEDUP_WINDOW_DAYS * 86400_000,
  ).toISOString();

  // 1. Pull stale draft plans owned by authed users.
  const { data: plans, error: planErr } = await admin
    .from("get_matched_action_plans")
    .select("id, auth_user_id, goal, intent_slug, share_token, updated_at")
    .eq("status", "draft")
    .not("auth_user_id", "is", null)
    .lt("updated_at", draftCutoff)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (planErr) {
    log.error("plan fetch failed", { error: planErr.message });
    return NextResponse.json({ error: planErr.message }, { status: 500 });
  }

  if (!plans || plans.length === 0) {
    return NextResponse.json({ sent: 0, message: "no stale drafts" });
  }

  const userIds = Array.from(
    new Set(plans.map((p) => p.auth_user_id as string)),
  );

  // 2. Skip users who got the digest in the last DEDUP_WINDOW_DAYS.
  const { data: recent } = await admin
    .from("plan_resume_emails")
    .select("auth_user_id")
    .in("auth_user_id", userIds)
    .gte("sent_at", dedupCutoff);

  const recentSet = new Set((recent ?? []).map((r) => r.auth_user_id as string));

  // 3. Resolve emails — one email per user, pick the most recently
  //    updated plan so the copy references the freshest goal.
  const byUser = new Map<string, (typeof plans)[number]>();
  for (const p of plans) {
    const uid = p.auth_user_id as string;
    if (!byUser.has(uid)) byUser.set(uid, p);
  }

  const targetUserIds = Array.from(byUser.keys()).filter(
    (uid) => !shouldSkip({ auth_user_id: uid }, recentSet),
  );

  if (targetUserIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "all deduped" });
  }

  const { data: users } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: Math.min(targetUserIds.length * 2, 1000),
  });

  const emailByUser = new Map<string, string>();
  for (const u of users?.users ?? []) {
    if (u.id && u.email && targetUserIds.includes(u.id)) {
      emailByUser.set(u.id, u.email);
    }
  }

  let sent = 0;
  let failed = 0;
  for (const uid of targetUserIds) {
    const plan = byUser.get(uid)!;
    const email = emailByUser.get(uid);
    if (!email) continue;
    const candidate: DigestCandidate = {
      plan_id: plan.id as number,
      auth_user_id: uid,
      email,
      goal: (plan.goal as string | null) ?? null,
      intent_slug: (plan.intent_slug as string | null) ?? null,
      share_token: plan.share_token as string,
      updated_at: plan.updated_at as string,
    };
    const { subject, html } = renderDigestEmail({
      goal: candidate.goal,
      intent_slug: candidate.intent_slug,
      share_token: candidate.share_token,
      baseUrl,
    });
    const result = await sendEmail({ to: email, subject, html });
    if (result.ok) {
      sent += 1;
      const { error: insertErr } = await admin
        .from("plan_resume_emails")
        .insert({ auth_user_id: uid, plan_id: candidate.plan_id });
      if (insertErr) {
        log.warn("dedup insert failed", { uid, err: insertErr.message });
      }
    } else {
      failed += 1;
      log.warn("send failed", { uid, err: result.error });
    }
  }

  return NextResponse.json({ sent, failed, scanned: plans.length });
}
