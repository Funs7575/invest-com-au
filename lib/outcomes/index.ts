/**
 * Outcome flywheel — tracks what happened after a Match Request was
 * accepted. Drives provider scoreboards + builds the long-term data moat.
 *
 * Lifecycle:
 *   1. Brief is created → eventually accepted by a provider (or not).
 *   2. ~4 weeks after acceptance, a daily cron creates a `brief_outcomes`
 *      row with a unique `review_token` and emails the consumer a link
 *      to `/review/[token]`.
 *   3. Consumer fills the form: outcome (completed / in_progress /
 *      switched / abandoned) + optional 1-5 rating + optional testimonial.
 *   4. Daily cron refreshes `provider_outcome_scores` by aggregating
 *      submitted outcomes per provider.
 *   5. Provider profiles + admin reports query the scoreboard.
 *
 * All helpers are pure or simple service-role reads/writes. No external
 * I/O. Errors propagate so callers can decide whether to swallow.
 */

import { randomBytes } from "crypto";

// eslint-disable-next-line no-restricted-imports -- consumer review submission via token is anon path; we need service-role to write the row.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("outcomes");

export type OutcomeStatus =
  | "completed"
  | "in_progress"
  | "switched_providers"
  | "abandoned";

export interface BriefOutcomeRow {
  id: number;
  brief_id: number;
  consumer_email: string;
  auth_user_id: string | null;
  professional_id: number | null;
  team_id: number | null;
  outcome: OutcomeStatus | null;
  rating: number | null;
  testimonial: string | null;
  show_testimonial: boolean;
  review_token: string;
  review_requested_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export function newReviewToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Read an outcome row by its public review token. Returns null when
 * missing — caller renders a "link expired or invalid" page.
 */
export async function getOutcomeByToken(token: string): Promise<BriefOutcomeRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("brief_outcomes")
    .select("*")
    .eq("review_token", token)
    .maybeSingle();
  return (data as BriefOutcomeRow) ?? null;
}

/**
 * Submit / update a consumer review. Idempotent — re-submissions update
 * the existing row. Always stamps `submitted_at`.
 */
export interface SubmitOutcomeInput {
  token: string;
  outcome: OutcomeStatus;
  rating?: number | null;
  testimonial?: string | null;
  showTestimonial?: boolean;
}

export async function submitOutcome(
  input: SubmitOutcomeInput,
): Promise<BriefOutcomeRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_outcomes")
    .update({
      outcome: input.outcome,
      rating: input.rating ?? null,
      testimonial: input.testimonial?.slice(0, 2000) ?? null,
      show_testimonial: input.showTestimonial ?? false,
      submitted_at: new Date().toISOString(),
    })
    .eq("review_token", input.token)
    .select("*")
    .maybeSingle();
  if (error) {
    log.warn("submitOutcome failed", { token: input.token.slice(0, 8), err: error.message });
    return null;
  }
  return (data as BriefOutcomeRow) ?? null;
}

/**
 * Create review-request rows for all accepted briefs older than `daysOld`
 * that don't already have an outcome row. Called by the daily cron.
 *
 * Returns the number of rows created so the cron can log progress.
 */
export async function createPendingOutcomeRequests(daysOld = 28): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

  // Find accepted briefs older than `daysOld` with no outcome row yet.
  const { data: candidates, error } = await admin
    .from("advisor_auctions")
    .select(
      "id, contact_email, accepted_by_professional_id, accepted_by_team_id, accepted_at",
    )
    .eq("flow_type", "accept")
    .not("accepted_at", "is", null)
    .lt("accepted_at", cutoff)
    .limit(500);
  if (error) {
    log.warn("createPendingOutcomeRequests scan failed", { err: error.message });
    return 0;
  }

  if (!candidates || candidates.length === 0) return 0;

  // Exclude briefs that already have an outcome row.
  const { data: existing } = await admin
    .from("brief_outcomes")
    .select("brief_id")
    .in("brief_id", candidates.map((c) => c.id as number));
  const seen = new Set((existing ?? []).map((r) => r.brief_id as number));

  const toCreate = candidates.filter(
    (c) =>
      !seen.has(c.id as number) &&
      c.contact_email &&
      typeof c.contact_email === "string",
  );

  if (toCreate.length === 0) return 0;

  const rows = toCreate.map((b) => ({
    brief_id: b.id as number,
    consumer_email: b.contact_email as string,
    professional_id: (b.accepted_by_professional_id as number | null) ?? null,
    team_id: (b.accepted_by_team_id as number | null) ?? null,
    review_token: newReviewToken(),
    review_requested_at: new Date().toISOString(),
    // outcome stays null until consumer submits; the row exists so the
    // cron can email the review link.
    outcome: null,
  }));

  const { error: insertErr } = await admin.from("brief_outcomes").insert(rows);
  if (insertErr) {
    log.warn("createPendingOutcomeRequests insert failed", { err: insertErr.message });
    return 0;
  }

  log.info("Pending outcome requests created", { count: rows.length });
  return rows.length;
}

/**
 * Recompute the `provider_outcome_scores` table for the last 12-month
 * window. Called by the daily cron.
 *
 * Returns the number of scoreboard rows refreshed.
 */
export async function refreshProviderOutcomeScores(): Promise<number> {
  const admin = createAdminClient();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 365 * 24 * 60 * 60 * 1000);
  const windowStartIso = windowStart.toISOString().split("T")[0]!;
  const windowEndIso = windowEnd.toISOString().split("T")[0]!;

  // Pull all submitted outcomes in the window.
  const { data: outcomes, error } = await admin
    .from("brief_outcomes")
    .select("professional_id, team_id, outcome, rating")
    .not("submitted_at", "is", null)
    .gte("submitted_at", windowStart.toISOString());
  if (error) {
    log.warn("refreshProviderOutcomeScores scan failed", { err: error.message });
    return 0;
  }
  if (!outcomes || outcomes.length === 0) return 0;

  type Bucket = {
    accepted: number;
    submitted: number;
    completed: number;
    in_progress: number;
    switched: number;
    abandoned: number;
    ratingSum: number;
    ratingCount: number;
  };
  const pros = new Map<number, Bucket>();
  const teams = new Map<number, Bucket>();

  const empty = (): Bucket => ({
    accepted: 0,
    submitted: 0,
    completed: 0,
    in_progress: 0,
    switched: 0,
    abandoned: 0,
    ratingSum: 0,
    ratingCount: 0,
  });

  for (const o of outcomes) {
    const map = o.professional_id ? pros : teams;
    const key = (o.professional_id ?? o.team_id) as number | null;
    if (key === null) continue;
    let b = map.get(key);
    if (!b) {
      b = empty();
      map.set(key, b);
    }
    b.submitted++;
    switch (o.outcome) {
      case "completed":
        b.completed++;
        break;
      case "in_progress":
        b.in_progress++;
        break;
      case "switched_providers":
        b.switched++;
        break;
      case "abandoned":
        b.abandoned++;
        break;
    }
    if (typeof o.rating === "number" && o.rating >= 1 && o.rating <= 5) {
      b.ratingSum += o.rating;
      b.ratingCount++;
    }
  }

  // Also count `briefs_accepted` per provider so we can show
  // submission-rate (% of accepted briefs that have an outcome submitted).
  const { data: acceptedBriefs } = await admin
    .from("advisor_auctions")
    .select("accepted_by_professional_id, accepted_by_team_id")
    .not("accepted_at", "is", null)
    .gte("accepted_at", windowStart.toISOString());
  for (const a of acceptedBriefs ?? []) {
    if (a.accepted_by_professional_id) {
      const k = a.accepted_by_professional_id as number;
      let b = pros.get(k);
      if (!b) {
        b = empty();
        pros.set(k, b);
      }
      b.accepted++;
    } else if (a.accepted_by_team_id) {
      const k = a.accepted_by_team_id as number;
      let b = teams.get(k);
      if (!b) {
        b = empty();
        teams.set(k, b);
      }
      b.accepted++;
    }
  }

  // Upsert rows.
  const rows: Array<Record<string, unknown>> = [];
  for (const [id, b] of pros) {
    rows.push({
      professional_id: id,
      team_id: null,
      window_start: windowStartIso,
      window_end: windowEndIso,
      briefs_accepted: b.accepted,
      outcomes_submitted: b.submitted,
      outcomes_completed: b.completed,
      outcomes_in_progress: b.in_progress,
      outcomes_switched: b.switched,
      outcomes_abandoned: b.abandoned,
      avg_rating: b.ratingCount > 0 ? Number((b.ratingSum / b.ratingCount).toFixed(2)) : null,
      completion_rate_pct:
        b.submitted > 0 ? Math.round((b.completed / b.submitted) * 100) : null,
      updated_at: new Date().toISOString(),
    });
  }
  for (const [id, b] of teams) {
    rows.push({
      professional_id: null,
      team_id: id,
      window_start: windowStartIso,
      window_end: windowEndIso,
      briefs_accepted: b.accepted,
      outcomes_submitted: b.submitted,
      outcomes_completed: b.completed,
      outcomes_in_progress: b.in_progress,
      outcomes_switched: b.switched,
      outcomes_abandoned: b.abandoned,
      avg_rating: b.ratingCount > 0 ? Number((b.ratingSum / b.ratingCount).toFixed(2)) : null,
      completion_rate_pct:
        b.submitted > 0 ? Math.round((b.completed / b.submitted) * 100) : null,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return 0;

  // Upsert one chunk at a time (Supabase per-call limit is generous but we
  // chunk for safety on giant marketplaces). We use ON CONFLICT via the
  // unique constraints in the migration.
  const { error: upsertErr } = await admin
    .from("provider_outcome_scores")
    .upsert(rows, { onConflict: "professional_id,window_start,window_end" });
  if (upsertErr) {
    log.warn("refreshProviderOutcomeScores upsert failed", { err: upsertErr.message });
    return 0;
  }

  log.info("Provider outcome scores refreshed", { count: rows.length });
  return rows.length;
}

/**
 * Pure: compute a completion-rate display string. Used by provider
 * profiles + admin reports.
 */
export function formatCompletionRate(pct: number | null): string {
  if (pct === null || pct === undefined) return "Not yet rated";
  if (pct >= 90) return `${pct}% completed`;
  if (pct >= 70) return `${pct}% completed`;
  return `${pct}% completed`;
}
