/**
 * Daily challenge nudge — emails enrolled participants today's task during a
 * cohort's active window.
 *
 * Dispatched by the `daily-9` cron group (see lib/cron-groups.ts). No entry is
 * added to vercel.json — the dispatcher fans out to this handler.
 *
 * DOUBLE-GATED (compliance requirement for lifecycle nudges):
 *   1. Feature flag `cohort_challenges` must be ON (fail-closed → no-op).
 *   2. The recipient's email preferences must permit it: we honour the
 *      `profiles.email_weekly_digest` lifecycle opt-out (the global unsubscribe
 *      sets it false), AND `sendEmail()` honours the suppression list. A user
 *      who unsubscribed or is suppressed is never emailed.
 *
 * IDEMPOTENT PER USER-DAY: each enrolment carries `last_nudge_on` (a UTC date).
 * We only email enrolments whose `last_nudge_on` is not today, and stamp it
 * after a successful send, so re-running the cron the same day sends nothing.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { getSiteUrl } from "@/lib/url";
import { getCurriculum, tasksForDay } from "@/lib/challenges/progress";
import { cohortCurrentDay, isCohortActive } from "@/lib/challenges/status";
import { COHORT_CHALLENGES_FLAG, type ChallengeRow } from "@/lib/challenges/data";
import type { ChallengeTask } from "@/lib/challenges/curricula";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron-challenge-daily-nudge");
const SITE_URL = getSiteUrl();

function todayUtcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function nudgeEmail(challengeTitle: string, task: ChallengeTask, slug: string): string {
  const actionUrl = `${SITE_URL}${task.href}`;
  const challengeUrl = `${SITE_URL}/challenges/${slug}`;
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
      <p style="color:#94a3b8;margin:0 0 4px;font-size:12px">${challengeTitle} · Day ${task.day}</p>
      <h1 style="color:white;margin:0;font-size:18px">Today's task: ${task.title}</h1>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:14px;line-height:1.6;color:#64748b">${task.description}</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${actionUrl}" style="display:inline-block;padding:12px 32px;background:#059669;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">${task.actionLabel}</a>
      </div>
      <p style="font-size:13px;color:#64748b;text-align:center">
        <a href="${challengeUrl}" style="color:#2563eb">View your full progress →</a>
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:20px;border-top:1px solid #f1f5f9;padding-top:12px">
        General information only — not personal financial advice.
        <a href="${SITE_URL}/api/unsubscribe" style="color:#94a3b8">Unsubscribe</a>.
      </p>
    </div></div>`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>(
    "challenge-daily-nudge",
    async () => {
      // Gate 1: feature flag. Fail-closed — dormant until launch.
      if (!(await isFlagEnabled(COHORT_CHALLENGES_FLAG))) {
        return {
          response: NextResponse.json({ ok: true, skipped: "flag_off" }),
          stats: { sent: 0 },
        };
      }

      if (!process.env.RESEND_API_KEY) {
        log.warn("RESEND_API_KEY not set — skipping challenge nudges");
        return {
          response: NextResponse.json({ ok: true, skipped: "no_resend" }),
          stats: { sent: 0 },
        };
      }

      const admin = createAdminClient();
      const now = new Date();
      const today = todayUtcDate(now);

      // Active cohorts only.
      const { data: challengeRows, error: chErr } = await admin
        .from("challenges")
        .select(
          "id, slug, title, description, curriculum_key, starts_at, ends_at, enrolment_open, max_cohort, club_id, created_at",
        );
      if (chErr) {
        log.error("failed to load challenges", { error: chErr.message });
        return {
          response: NextResponse.json({ ok: false, error: chErr.message }),
          stats: { sent: 0 },
        };
      }

      const activeChallenges = ((challengeRows as ChallengeRow[] | null) ?? []).filter(
        (c) => isCohortActive(c, now) && getCurriculum(c.curriculum_key) !== null,
      );

      let sent = 0;
      let processed = 0;

      for (const challenge of activeChallenges) {
        const curriculum = getCurriculum(challenge.curriculum_key);
        if (!curriculum) continue;

        const day = cohortCurrentDay(challenge, curriculum.durationDays, now);
        if (day <= 0) continue;
        const todaysTasks = tasksForDay(curriculum, day);
        const task = todaysTasks[0];
        if (!task) continue; // no task scheduled for this day

        // Enrolled participants not yet nudged today.
        const { data: enrolments, error: enrErr } = await admin
          .from("challenge_enrolments")
          .select("id, user_id, last_nudge_on")
          .eq("challenge_id", challenge.id)
          .eq("status", "enrolled")
          .or(`last_nudge_on.is.null,last_nudge_on.neq.${today}`);
        if (enrErr) {
          log.warn("failed to load enrolments", {
            challengeId: challenge.id,
            error: enrErr.message,
          });
          continue;
        }
        const rows = (enrolments as
          | { id: string; user_id: string; last_nudge_on: string | null }[]
          | null) ?? [];
        if (rows.length === 0) continue;

        // Resolve emails + lifecycle preference in one query (Gate 2a).
        const userIds = rows.map((r) => r.user_id);
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, email, email_weekly_digest")
          .in("id", userIds);
        const profileById = new Map(
          ((profiles as
            | { id: string; email: string | null; email_weekly_digest: boolean | null }[]
            | null) ?? []
          ).map((p) => [p.id, p]),
        );

        const html = nudgeEmail(challenge.title, task, challenge.slug);
        const subject = `${challenge.title} — Day ${task.day}: ${task.title}`;

        for (const row of rows) {
          processed += 1;
          const profile = profileById.get(row.user_id);
          // Gate 2a: respect the lifecycle email opt-out.
          if (!profile?.email || profile.email_weekly_digest === false) continue;

          // Gate 2b: sendEmail() honours the suppression list internally.
          const { ok } = await sendEmail({
            to: profile.email,
            subject,
            html,
          });

          // Stamp idempotency regardless of ok? Only on a real send so a
          // transient failure can be retried next run. Suppressed/opted-out
          // recipients are filtered above and never reach here.
          if (ok) {
            await admin
              .from("challenge_enrolments")
              .update({ last_nudge_on: today })
              .eq("id", row.id);
            sent += 1;
          }
        }
      }

      log.info("challenge daily nudge complete", { sent, processed });
      return {
        response: NextResponse.json({ ok: true, sent, processed }),
        stats: { sent, processed },
      };
    },
    {
      triggeredBy: req.headers.get("x-admin-manual") ? "admin_manual" : "cron",
    },
  );
}
