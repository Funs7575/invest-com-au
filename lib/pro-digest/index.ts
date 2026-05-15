/**
 * Pro weekly digest — Mondays 09:00 AEST (= Sunday 23:00 UTC, fires from
 * the daily-23 dispatcher when getUTCDay() === 0). Each verified active pro
 * gets a digest of new open briefs from the past 7 days, filtered to their
 * specialty tags.
 *
 * Idempotency: unique (professional_id, period_start) constraint. The
 * orchestrator writes the audit row BEFORE the Resend call so a crash
 * leaves a record. Re-runs are safe no-ops.
 */
// eslint-disable-next-line no-restricted-imports -- cross-pro fan-out under a cron context with no user JWT; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:pro-digest");

const FROM = "Invest.com.au <hello@invest.com.au>";

export interface DigestRunResult {
  pros_considered: number;
  pros_sent: number;
  pros_skipped_idempotent: number;
  pros_failed: number;
}

type DigestBrief = {
  id: number;
  slug: string | null;
  job_title: string | null;
  brief_template: string | null;
  brief_payload: Record<string, unknown> | null;
  created_at: string;
};

export async function runProDigest(now: Date = new Date()): Promise<DigestRunResult> {
  const admin = createAdminClient();
  const periodEnd = new Date(now);
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const periodEndIso = periodEnd.toISOString().slice(0, 10);

  const { data: pros } = await admin
    .from("professionals")
    .select("id, name, email, specialty_tags, location_state")
    .eq("status", "active")
    .in("profile_quality_gate", ["passed", "pending"]);

  if (!pros || pros.length === 0) {
    return {
      pros_considered: 0,
      pros_sent: 0,
      pros_skipped_idempotent: 0,
      pros_failed: 0,
    };
  }

  const result: DigestRunResult = {
    pros_considered: pros.length,
    pros_sent: 0,
    pros_skipped_idempotent: 0,
    pros_failed: 0,
  };

  for (const pro of pros as Array<{
    id: number;
    name: string;
    email: string | null;
    specialty_tags: string[] | null;
    location_state: string | null;
  }>) {
    if (!pro.email) {
      result.pros_failed++;
      continue;
    }
    // Has this pro already received this week's digest?
    const { data: prior } = await admin
      .from("pro_digest_sends")
      .select("id")
      .eq("professional_id", pro.id)
      .eq("period_start", periodStartIso)
      .maybeSingle();
    if (prior) {
      result.pros_skipped_idempotent++;
      continue;
    }

    // Find matching briefs.
    const { data: briefs } = await admin
      .from("advisor_auctions")
      .select("id, slug, job_title, brief_template, brief_payload, created_at")
      .eq("flow_type", "accept")
      .eq("status", "open")
      .is("accepted_by_team_id", null)
      .is("accepted_by_professional_id", null)
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    const briefList = (briefs ?? []) as DigestBrief[];
    const matching = filterBriefsForPro(briefList, pro.specialty_tags ?? []);
    if (matching.length === 0) {
      // Still record we considered them so we don't re-evaluate next run.
      await admin.from("pro_digest_sends").insert({
        professional_id: pro.id,
        period_start: periodStartIso,
        period_end: periodEndIso,
        brief_count: 0,
      });
      result.pros_skipped_idempotent++;
      continue;
    }

    // Idempotency row FIRST so a crash leaves a marker.
    const { error: writeErr } = await admin.from("pro_digest_sends").insert({
      professional_id: pro.id,
      period_start: periodStartIso,
      period_end: periodEndIso,
      brief_count: matching.length,
    });
    if (writeErr) {
      // Race: another runner already wrote this period — count as idempotent.
      if (writeErr.code === "23505") {
        result.pros_skipped_idempotent++;
        continue;
      }
      result.pros_failed++;
      continue;
    }

    // Per-recipient try/catch so one bad send doesn't block the rest.
    try {
      const enriched = matching
        .slice(0, 10)
        .map((b) => enrichBriefForRender(b, briefList));
      const ok = await sendDigestEmail({
        to: pro.email,
        proName: pro.name,
        briefs: enriched,
      });
      if (ok) {
        result.pros_sent++;
      } else {
        result.pros_failed++;
      }
    } catch (err) {
      log.warn("digest send failed", {
        professional_id: pro.id,
        err: err instanceof Error ? err.message : String(err),
      });
      result.pros_failed++;
    }
  }

  return result;
}

export function filterBriefsForPro(
  briefs: Array<{
    id: number;
    brief_template: string | null;
    brief_payload: Record<string, unknown> | null;
  }>,
  specialtyTags: string[],
): Array<{ id: number; brief_template: string | null }> {
  if (specialtyTags.length === 0) {
    // No specialty filter — show all open briefs.
    return briefs.map((b) => ({ id: b.id, brief_template: b.brief_template }));
  }
  const lowerTags = specialtyTags.map((t) => t.toLowerCase());
  return briefs.filter((b) => {
    if (!b.brief_template) return false;
    return lowerTags.some((t) => b.brief_template!.toLowerCase().includes(t));
  });
}

interface RenderedBrief {
  id: number;
  title: string;
  slug: string | null;
  budget_band: string | null;
  location_state: string | null;
}

function enrichBriefForRender(
  match: { id: number; brief_template: string | null },
  all: DigestBrief[],
): RenderedBrief {
  const src = all.find((b) => b.id === match.id);
  const payload = (src?.brief_payload ?? {}) as Record<string, unknown>;
  const budget = typeof payload.budget_band === "string" ? payload.budget_band : null;
  const loc = typeof payload.location_state === "string" ? payload.location_state : null;
  return {
    id: match.id,
    title: src?.job_title ?? prettifyTemplate(match.brief_template) ?? `Brief #${match.id}`,
    slug: src?.slug ?? null,
    budget_band: budget,
    location_state: loc,
  };
}

function prettifyTemplate(t: string | null | undefined): string | null {
  if (!t) return null;
  return t
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDigestHtml(input: {
  proName: string;
  briefs: RenderedBrief[];
}): string {
  const greeting = `Hi ${escapeHtml(input.proName || "there")},`;
  const rows = input.briefs
    .map((b) => {
      const title = escapeHtml(b.title);
      const budget = b.budget_band
        ? `<p style="font-size:13px;color:#475569;margin:4px 0"><strong>Budget:</strong> ${escapeHtml(b.budget_band.replace(/_/g, " "))}</p>`
        : "";
      const loc = b.location_state
        ? `<p style="font-size:13px;color:#475569;margin:4px 0"><strong>Location:</strong> ${escapeHtml(b.location_state)}</p>`
        : "";
      const href = b.slug
        ? `${SITE_URL}/briefs/${encodeURIComponent(b.slug)}`
        : `${SITE_URL}/advisor-portal/briefs`;
      return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0">
  <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 6px 0">${title}</p>
  ${budget}
  ${loc}
  <p style="margin:10px 0 0 0"><a href="${href}" style="color:#0f172a;text-decoration:none;font-weight:600;font-size:13px">View brief &rarr;</a></p>
</div>`;
    })
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">Invest.com.au &mdash; Weekly Brief Digest</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px"><p style="font-size:15px;margin:0 0 8px 0">${greeting}</p><p style="font-size:14px;color:#475569;margin:0 0 12px 0">Here are up to ${input.briefs.length} new open brief${input.briefs.length === 1 ? "" : "s"} matching your specialties from the past week.</p>${rows}<p style="font-size:11px;color:#94a3b8;margin-top:24px">General information only &mdash; not personal advice. Manage email preferences at <a href="${SITE_URL}/pros/billing" style="color:#94a3b8">${SITE_URL}/pros/billing</a>.</p></div></div>`;
}

export function renderDigestText(input: {
  proName: string;
  briefs: RenderedBrief[];
}): string {
  const lines: string[] = [];
  lines.push(`Invest.com.au — Weekly Brief Digest`);
  lines.push("");
  lines.push(`Hi ${input.proName || "there"},`);
  lines.push("");
  lines.push(
    `Here are up to ${input.briefs.length} new open brief${input.briefs.length === 1 ? "" : "s"} matching your specialties from the past week.`,
  );
  lines.push("");
  for (const b of input.briefs) {
    lines.push(`- ${b.title}`);
    if (b.budget_band) lines.push(`  Budget: ${b.budget_band.replace(/_/g, " ")}`);
    if (b.location_state) lines.push(`  Location: ${b.location_state}`);
    const href = b.slug
      ? `${SITE_URL}/briefs/${b.slug}`
      : `${SITE_URL}/advisor-portal/briefs`;
    lines.push(`  View brief: ${href}`);
    lines.push("");
  }
  lines.push(
    `Manage email preferences: ${SITE_URL}/pros/billing`,
  );
  lines.push(`General information only — not personal advice.`);
  return lines.join("\n");
}

async function sendDigestEmail(input: {
  to: string;
  proName: string;
  briefs: RenderedBrief[];
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    log.warn("RESEND_API_KEY not set — skipping digest send", { to: input.to });
    return false;
  }
  const html = renderDigestHtml({ proName: input.proName, briefs: input.briefs });
  const text = renderDigestText({ proName: input.proName, briefs: input.briefs });
  const subject = `${input.briefs.length} new brief${input.briefs.length === 1 ? "" : "s"} this week`;
  const { ok, error } = await sendEmail({
    from: FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (!ok) {
    log.warn("Resend send rejected", { to: input.to, error });
  }
  return ok;
}
