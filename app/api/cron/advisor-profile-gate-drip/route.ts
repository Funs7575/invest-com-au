import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";

const log = logger("cron:advisor-profile-gate-drip");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily cron that walks every advisor whose profile is stuck in
 * `profile_quality_gate = 'pending'` and nudges them forward with a
 * drip sequence of increasingly firm emails, each deep-linked to
 * the specific fields they're missing.
 *
 * State machine (days since `profile_gate_checked_at`):
 *
 *   Day 1:   welcome + list of missing fields
 *   Day 3:   reminder 1 ("your profile is 80% done")
 *   Day 7:   reminder 2 ("only a few fields left")
 *   Day 14:  final warning
 *   Day 21:  auto-archive (status = 'incomplete'), removed from directory
 *
 * On every run, we also re-evaluate the profile: if all missing fields
 * are now populated, flip the gate to 'passed' and email congratulations.
 *
 * Idempotent via the `profile_gate_step` column (added in the migration).
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const siteUrl = getSiteUrl();

  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, status, profile_quality_gate, profile_missing_fields, profile_gate_checked_at, profile_gate_step")
    .eq("profile_quality_gate", "pending")
    .neq("status", "incomplete")
    .limit(1000);

  if (error) {
    log.error("Failed to fetch advisors", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: advisors?.length || 0,
    unlocked: 0,
    drip1: 0,
    drip3: 0,
    drip7: 0,
    drip14: 0,
    archived: 0,
    failed: 0,
  };

  for (const advisor of advisors || []) {
    try {
      // Re-check the current missing fields by actually looking at the row
      const { data: fresh } = await supabase
        .from("professionals")
        .select("name, bio, photo_url, phone, website, specialties, fee_description, location_state")
        .eq("id", advisor.id)
        .maybeSingle();
      if (!fresh) continue;

      const missing: string[] = [];
      if (!fresh.bio || fresh.bio.trim().length < 50) missing.push("bio");
      if (!fresh.photo_url) missing.push("photo");
      if (!fresh.phone) missing.push("phone");
      if (!fresh.website) missing.push("website");
      if (!fresh.specialties || fresh.specialties.length === 0) missing.push("specialties");
      if (!fresh.fee_description) missing.push("fee_description");
      if (!fresh.location_state) missing.push("location_state");

      // Gate passes!
      if (missing.length === 0) {
        await supabase
          .from("professionals")
          .update({
            profile_quality_gate: "passed",
            profile_gate_checked_at: now.toISOString(),
            profile_missing_fields: null,
            profile_gate_step: null,
          })
          .eq("id", advisor.id);

        sendEmail(
          advisor.email,
          "Your profile is live in the directory",
          `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
            <h2 style="color:#15803d;font-size:18px">🎉 Profile complete</h2>
            <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")}, your advisor profile has passed our quality checks and is now live in the directory. You'll start receiving lead enquiries.</p>
            <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Go to portal →</a>
          </div>`,
        );
        stats.unlocked++;
        continue;
      }

      // Update missing fields list for future cron runs / admin view
      await supabase
        .from("professionals")
        .update({
          profile_missing_fields: missing,
          profile_gate_checked_at: now.toISOString(),
        })
        .eq("id", advisor.id);

      // Determine where we are in the drip
      const checkedAt = advisor.profile_gate_checked_at
        ? new Date(advisor.profile_gate_checked_at)
        : null;
      const daysSince = checkedAt
        ? Math.floor((now.getTime() - checkedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const currentStep = advisor.profile_gate_step || 0;

      const missingList = missing
        .map((f) => `<li style="margin:2px 0">${escapeHtml(f.replace(/_/g, " "))}</li>`)
        .join("");

      // Day 21+: auto-archive
      if (daysSince >= 21) {
        await supabase
          .from("professionals")
          .update({ status: "incomplete" })
          .eq("id", advisor.id);
        sendEmail(
          advisor.email,
          "Your profile has been archived",
          `<p>Your advisor profile was archived because it was left incomplete for 21 days. Reply to this email when you're ready to reactivate.</p>`,
        );
        stats.archived++;
        continue;
      }

      // Pick the right drip step
      const step =
        daysSince >= 14 ? 4 :
        daysSince >= 7 ? 3 :
        daysSince >= 3 ? 2 :
        daysSince >= 1 ? 1 :
        0;

      // Only send if we haven't sent this step yet
      if (step === 0 || step <= currentStep) continue;

      const subjects = [
        "",
        "Complete your profile to start receiving leads",
        "Quick reminder: a few fields left",
        "Your profile is nearly ready",
        "Last chance: your profile will be archived soon",
      ];
      const urgency = [
        "",
        "You're almost there",
        "Still waiting on a few fields",
        "Only a few days left",
        "⚠️ Last chance",
      ];

      sendEmail(
        advisor.email,
        subjects[step],
        `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:#0f172a;font-size:18px">${urgency[step]}</h2>
          <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")}, your profile is almost ready to go live. Fill in these fields and it'll be reviewed on the next daily cron run:</p>
          <ul style="font-size:14px;color:#334155">${missingList}</ul>
          <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Complete profile →</a>
          ${step === 4 ? '<p style="font-size:12px;color:#dc2626;margin-top:16px">Your profile will be archived in 7 days if not completed.</p>' : ""}
        </div>`,
      );

      await supabase
        .from("professionals")
        .update({ profile_gate_step: step })
        .eq("id", advisor.id);

      if (step === 1) stats.drip1++;
      else if (step === 2) stats.drip3++;
      else if (step === 3) stats.drip7++;
      else if (step === 4) stats.drip14++;
    } catch (err) {
      stats.failed++;
      log.error("Profile gate drip threw for advisor", {
        advisorId: advisor.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Profile gate drip cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

function sendEmail(to: string | null, subject: string, html: string): void {
  if (!to || !process.env.RESEND_API_KEY) return;
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <advisors@invest.com.au>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}
