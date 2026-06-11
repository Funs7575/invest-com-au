/**
 * Engagement registry — the post-match relationship loop.
 *
 * Seeded from accepted briefs, each row tracks one consumer↔provider
 * relationship and drives scheduled check-ins:
 *
 *   stage 0 → sent at started_at + 30d  ("how's it going?")
 *   stage 1 → sent at started_at + 90d  ("quick check-in")
 *   stage 2 → sent at started_at + 365d (the ANNUAL ADVISER REVIEW)
 *
 * Check-in emails carry one-time token links to /engagement/[token]
 * where the consumer confirms a status (going well / wrapped up / didn't
 * proceed) or, at the annual stage, completes a 2-minute review (rating,
 * fee band paid, considering a change). A consumer who is considering a
 * change is OFFERED a pre-filled anonymised re-brief — framed strictly
 * as "compare your options", never "you should switch" (general
 * information only; see lib/compliance.ts).
 *
 * Status semantics: 'ended'/'completed' stop future check-ins; 'active'
 * (default) and 'engaged' keep the cadence going. Everything is gated by
 * the `engagement_checkins` feature flag (absent ⇒ the cron is a no-op),
 * because the send path emails real consumers.
 */

// eslint-disable-next-line no-restricted-imports -- registry rows are written by cron (no JWT) and read on the anonymous token surface; engagement_registry is service-role-only by design like brief_outcomes.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { newReviewToken } from "@/lib/outcomes";
import { sendEngagementCheckin } from "@/lib/marketplace-emails";

const log = logger("briefs:engagements");

export const ENGAGEMENT_CHECKINS_FLAG = "engagement_checkins";

/** Days after started_at for each check-in stage. Stage 2 is the annual review. */
export const CHECKIN_STAGE_DAYS = [30, 90, 365] as const;
export const ANNUAL_STAGE = 2;
export const MAX_STAGES = CHECKIN_STAGE_DAYS.length;

export type EngagementStatus = "active" | "engaged" | "completed" | "ended";

export const ENGAGEMENT_STATUSES: EngagementStatus[] = [
  "active",
  "engaged",
  "completed",
  "ended",
];

export interface EngagementRow {
  id: number;
  brief_id: number;
  professional_id: number | null;
  team_id: number | null;
  consumer_email: string;
  status: EngagementStatus;
  started_at: string;
  checkin_token: string;
  checkin_stage: number;
  next_checkin_at: string | null;
  last_checkin_sent_at: string | null;
  last_status_update_at: string | null;
  annual_rating: number | null;
  annual_fee_band: string | null;
  considering_change: boolean | null;
  annual_review_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Pure cadence helpers (unit-tested without a DB) ─────────────────────

/** When should the check-in for `stage` (0-based) go out? Null when done. */
export function checkinDueAt(startedAt: string, stage: number): string | null {
  if (stage < 0 || stage >= MAX_STAGES) return null;
  const days = CHECKIN_STAGE_DAYS[stage]!;
  return new Date(new Date(startedAt).getTime() + days * 86_400_000).toISOString();
}

export function isAnnualStage(stage: number): boolean {
  return stage === ANNUAL_STAGE;
}

/** Statuses that keep the cadence alive. */
export function statusKeepsCadence(status: EngagementStatus): boolean {
  return status === "active" || status === "engaged";
}

// ─── Seeding ─────────────────────────────────────────────────────────────

/**
 * Create registry rows for accepted briefs that don't have one yet.
 * Idempotent via the brief_id UNIQUE constraint + insert-or-ignore.
 */
export async function seedEngagements(limit = 200): Promise<number> {
  const admin = createAdminClient();
  const { data: briefs, error } = await admin
    .from("advisor_auctions")
    .select("id, accepted_at, accepted_by_professional_id, accepted_by_team_id, contact_email")
    .eq("flow_type", "accept")
    .not("accepted_at", "is", null)
    .not("contact_email", "is", null)
    .order("accepted_at", { ascending: false })
    .limit(limit);
  if (error) {
    log.warn("seedEngagements scan failed", { err: error.message });
    return 0;
  }
  const candidates = (briefs ?? []).filter(
    (b) => typeof b.contact_email === "string" && b.contact_email.includes("@"),
  );
  if (candidates.length === 0) return 0;

  const rows = candidates.map((b) => ({
    brief_id: b.id as number,
    professional_id: (b.accepted_by_professional_id as number | null) ?? null,
    team_id: (b.accepted_by_team_id as number | null) ?? null,
    consumer_email: (b.contact_email as string).toLowerCase().trim(),
    status: "active",
    started_at: b.accepted_at as string,
    checkin_token: newReviewToken(),
    checkin_stage: 0,
    next_checkin_at: checkinDueAt(b.accepted_at as string, 0),
  }));

  const { data: inserted, error: insertError } = await admin
    .from("engagement_registry")
    .upsert(rows, { onConflict: "brief_id", ignoreDuplicates: true })
    .select("id");
  if (insertError) {
    log.warn("seedEngagements insert failed", { err: insertError.message });
    return 0;
  }
  return (inserted ?? []).length;
}

// ─── Sending ─────────────────────────────────────────────────────────────

export interface CheckinSendStats {
  due: number;
  sent: number;
}

/** Send every due check-in (caller has already verified the feature flag). */
export async function sendDueCheckins(now: Date = new Date()): Promise<CheckinSendStats> {
  const admin = createAdminClient();
  const { data: due, error } = await admin
    .from("engagement_registry")
    .select("*")
    .lte("next_checkin_at", now.toISOString())
    .in("status", ["active", "engaged"])
    .lt("checkin_stage", MAX_STAGES)
    .order("next_checkin_at", { ascending: true })
    .limit(100);
  if (error) {
    log.warn("sendDueCheckins scan failed", { err: error.message });
    return { due: 0, sent: 0 };
  }

  const rows = (due ?? []) as unknown as EngagementRow[];
  let sent = 0;
  for (const row of rows) {
    try {
      const providerName = await resolveProviderName(row);
      const briefTitle = await resolveBriefTitle(row.brief_id);
      const ok = await sendEngagementCheckin({
        consumerEmail: row.consumer_email,
        providerName,
        briefTitle,
        stage: row.checkin_stage,
        annual: isAnnualStage(row.checkin_stage),
        checkinUrl: `/engagement/${row.checkin_token}`,
      });
      // Advance the cadence even when the send reports a soft failure —
      // sendEmail is fail-soft (suppressed / missing key) and retrying the
      // same consumer daily would be worse than skipping one touch.
      const nextStage = row.checkin_stage + 1;
      await admin
        .from("engagement_registry")
        .update({
          checkin_stage: nextStage,
          next_checkin_at: checkinDueAt(row.started_at, nextStage),
          last_checkin_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", row.id)
        .eq("checkin_stage", row.checkin_stage); // optimistic guard vs double-send
      if (ok) sent += 1;
    } catch (err) {
      log.warn("check-in send failed", {
        engagementId: row.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { due: rows.length, sent };
}

async function resolveProviderName(row: EngagementRow): Promise<string> {
  const admin = createAdminClient();
  if (row.team_id) {
    const { data } = await admin
      .from("expert_teams")
      .select("name")
      .eq("id", row.team_id)
      .maybeSingle();
    if (data?.name) return data.name as string;
  }
  if (row.professional_id) {
    const { data } = await admin
      .from("professionals")
      .select("name")
      .eq("id", row.professional_id)
      .maybeSingle();
    if (data?.name) return data.name as string;
  }
  return "your pro";
}

async function resolveBriefTitle(briefId: number): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_auctions")
    .select("job_title")
    .eq("id", briefId)
    .maybeSingle();
  return (data?.job_title as string) || "your Match Request";
}

// ─── Token surface ───────────────────────────────────────────────────────

export async function getEngagementByToken(token: string): Promise<EngagementRow | null> {
  if (!token || token.length < 10) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("engagement_registry")
    .select("*")
    .eq("checkin_token", token)
    .maybeSingle();
  if (error) {
    log.warn("getEngagementByToken failed", { err: error.message });
    return null;
  }
  return (data as unknown as EngagementRow) ?? null;
}

/** Idempotent status set; ending statuses also stop future check-ins. */
export async function applyEngagementStatus(
  token: string,
  status: EngagementStatus,
): Promise<EngagementRow | null> {
  const row = await getEngagementByToken(token);
  if (!row) return null;
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {
    status,
    last_status_update_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!statusKeepsCadence(status)) updates.next_checkin_at = null;
  const { data, error } = await admin
    .from("engagement_registry")
    .update(updates)
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) {
    log.warn("applyEngagementStatus failed", { token: token.slice(0, 8), err: error.message });
    return null;
  }
  return data as unknown as EngagementRow;
}

export interface AnnualReviewInput {
  rating: number;
  feeBand: string | null;
  consideringChange: boolean;
}

/**
 * Store the annual review. Returns the updated row plus a pre-filled
 * re-brief URL when the consumer said they're considering a change.
 */
export async function submitAnnualReview(
  token: string,
  input: AnnualReviewInput,
): Promise<{ row: EngagementRow; rebriefUrl: string | null } | null> {
  const row = await getEngagementByToken(token);
  if (!row) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("engagement_registry")
    .update({
      annual_rating: input.rating,
      annual_fee_band: input.feeBand,
      considering_change: input.consideringChange,
      annual_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) {
    log.warn("submitAnnualReview failed", { token: token.slice(0, 8), err: error.message });
    return null;
  }

  let rebriefUrl: string | null = null;
  if (input.consideringChange) {
    rebriefUrl = await buildRebriefUrl(row.brief_id);
  }
  return { row: data as unknown as EngagementRow, rebriefUrl };
}

/** Pre-fill a fresh anonymous brief from the original's template + state. */
async function buildRebriefUrl(briefId: number): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("advisor_auctions")
      .select("brief_template, provider_preference")
      .eq("id", briefId)
      .maybeSingle();
    const params = new URLSearchParams();
    if (data?.brief_template) params.set("template", data.brief_template as string);
    if (data?.provider_preference)
      params.set("provider_preference", data.provider_preference as string);
    const qs = params.toString();
    return qs ? `/briefs/new?${qs}` : "/briefs/new";
  } catch {
    return "/briefs/new";
  }
}

/** Relationships for the signed-in /account/advisers page (email-matched). */
export async function listEngagementsForEmail(email: string): Promise<EngagementRow[]> {
  if (!email) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("engagement_registry")
    .select("*")
    .eq("consumer_email", email.toLowerCase().trim())
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) {
    log.warn("listEngagementsForEmail failed", { err: error.message });
    return [];
  }
  return (data ?? []) as unknown as EngagementRow[];
}

/** Cron entry: seed new engagements, then send due check-ins. Flag-gated. */
export async function runEngagementCheckins(
  now: Date = new Date(),
): Promise<{ enabled: boolean; seeded: number; due: number; sent: number }> {
  const enabled = await isFlagEnabled(ENGAGEMENT_CHECKINS_FLAG, { segment: "user" });
  if (!enabled) return { enabled: false, seeded: 0, due: 0, sent: 0 };
  const seeded = await seedEngagements();
  const { due, sent } = await sendDueCheckins(now);
  return { enabled: true, seeded, due, sent };
}
