/**
 * lib/decision-kit/respondents.ts
 *
 * Decision Kit — server-side composition of the respondent comparison matrix
 * and the scorecard read/write data layer.
 *
 * COMPOSITION: For a set of responding advisers (quote bidders, or an accepted
 *   brief provider) we assemble one `RespondentRow` each from REAL existing
 *   signals — the bid/quote amount, the Advisor Trust Score
 *   (lib/advisor-trust-score.ts), median response speed
 *   (lib/advisor-response-time.ts), the verified-outcome badge
 *   (lib/outcomes/profile-display.ts), specialties, and location. Every metric
 *   is independently nullable: when a signal is missing we show an honest gap,
 *   never a fabricated number. No ranking verdict is produced here.
 *
 * SCORECARDS: read/write `respondent_scorecards`, keyed by the consumer's
 *   contact email (owner_key) exactly like the surfaces that authorise the
 *   consumer (brief tracker / quote page). Everything FAILS SOFT — if the
 *   table is absent (pre-merge / migration not yet pushed) reads return [] and
 *   writes return a soft failure rather than throwing, so nothing 500s.
 */

// eslint-disable-next-line no-restricted-imports -- Decision Kit composes data for the anonymous email-link consumer surfaces (brief tracker / quote page) where there is no JWT; respondent_scorecards is service-role-only by design (email is the owner key, not auth.uid()) and the trust/response/outcome reads it joins all already use the admin client. The owner email is re-verified at the API route before any write — same posture as lib/outcomes.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  computeAdvisorTrustScore,
  type AdvisorTrustScore,
} from "@/lib/advisor-trust-score";
import {
  batchAdvisorResponseTimes,
  type ResponseTimeStats,
} from "@/lib/advisor-response-time";
import { getProviderOutcomeBadge, type ProviderOutcomeBadge } from "@/lib/outcomes/profile-display";
import {
  sanitiseCriteria,
  type RespondentScorecard,
  type ScorecardCriteria,
} from "./scorecards";

const log = logger("decision-kit:respondents");

/** Normalise the consumer identity used as owner_key everywhere. */
export function normaliseOwnerKey(email: string | null | undefined): string {
  return (email ?? "").toLowerCase().trim();
}

/* ─── Respondent matrix row ─── */

export interface RespondentInput {
  /** professionals.id of the responding adviser. */
  professionalId: number;
  /** The quote/bid amount IN CENTS, if this respondent submitted one. */
  amountCents: number | null;
  /** The bid row id (used as a stable React key / compare id). */
  bidId: number | null;
}

export interface RespondentRow {
  professionalId: number;
  slug: string | null;
  name: string;
  firmName: string | null;
  photoUrl: string | null;
  type: string | null;
  specialties: string[];
  locationDisplay: string | null;
  /** meeting modes, e.g. ["in-person","video","phone"] — for remote signal. */
  meetingTypes: string[];
  verified: boolean;
  bookingEnabled: boolean;
  bookingLink: string | null;
  acceptingNewClients: boolean;

  /** The quote/bid amount in cents (honest gap when null). */
  amountCents: number | null;
  bidId: number | null;

  /** Composite trust score (always present — pure from the row). */
  trust: AdvisorTrustScore;
  /** Median response speed (null when too few samples). */
  responseTime: ResponseTimeStats | null;
  /** Verified-outcome badge (null when < 3 outcomes). */
  outcome: ProviderOutcomeBadge | null;
}

/** Columns the matrix needs from `professionals`. */
const PRO_COLUMNS =
  "id, slug, name, firm_name, photo_url, type, specialties, location_display, " +
  "meeting_types, verified, booking_enabled, booking_link, accepting_new_clients, " +
  "afsl_number, registration_number, verified_at, created_at, years_experience, " +
  "bio, qualifications, education, memberships, fee_structure, fee_description, " +
  "linkedin_url, website, languages, rating, review_count";

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

/**
 * Compose the respondent comparison rows for a set of responding advisers.
 * Pulls the professional rows in one query, response times in one batched
 * query, and the outcome badge per pro (each fail-soft). Returns rows in the
 * SAME order as `inputs` (so the caller controls ordering, e.g. cheapest bid
 * first). Missing professionals are dropped. Never throws.
 */
export async function composeRespondentRows(
  inputs: RespondentInput[],
): Promise<RespondentRow[]> {
  if (inputs.length === 0) return [];
  const ids = Array.from(new Set(inputs.map((i) => i.professionalId)));

  const admin = createAdminClient();

  // Professionals (one round-trip).
  let proRows: Record<string, unknown>[] = [];
  try {
    const { data, error } = await admin
      .from("professionals")
      .select(PRO_COLUMNS)
      .in("id", ids);
    if (error) throw error;
    // Cast via unknown: the supabase-js select() return type is a union whose
    // error branch (GenericStringError[]) doesn't overlap our row shape, even
    // though we've thrown on `error` above.
    proRows = (data ?? []) as unknown as Record<string, unknown>[];
  } catch (err) {
    log.warn("composeRespondentRows: professionals fetch failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
  const proById = new Map<number, Record<string, unknown>>();
  for (const r of proRows) proById.set(r.id as number, r);

  // Response times (one batched round-trip, fail-soft).
  let responseTimes = new Map<number, ResponseTimeStats>();
  try {
    responseTimes = await batchAdvisorResponseTimes(ids);
  } catch (err) {
    log.warn("composeRespondentRows: response times failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Outcome badges (per-pro, fail-soft, parallel).
  const outcomeEntries = await Promise.all(
    ids.map(async (id): Promise<[number, ProviderOutcomeBadge | null]> => {
      try {
        return [id, await getProviderOutcomeBadge({ professionalId: id })];
      } catch {
        return [id, null];
      }
    }),
  );
  const outcomeById = new Map(outcomeEntries);

  const now = new Date().toISOString();
  const rows: RespondentRow[] = [];
  for (const input of inputs) {
    const pro = proById.get(input.professionalId);
    if (!pro) continue;

    const trust = computeAdvisorTrustScore(
      {
        verified: pro.verified as boolean | null,
        afsl_number: pro.afsl_number as string | null,
        registration_number: pro.registration_number as string | null,
        verified_at: pro.verified_at as string | null,
        created_at: pro.created_at as string | null,
        years_experience: pro.years_experience as number | null,
        bio: pro.bio as string | null,
        photo_url: pro.photo_url as string | null,
        qualifications: pro.qualifications as unknown[] | null,
        education: pro.education as unknown[] | null,
        memberships: pro.memberships as unknown[] | null,
        fee_structure: pro.fee_structure as string | null,
        fee_description: pro.fee_description as string | null,
        linkedin_url: pro.linkedin_url as string | null,
        website: pro.website as string | null,
        languages: pro.languages as unknown[] | null,
        rating: pro.rating as number | null,
        review_count: pro.review_count as number | null,
      },
      now,
    );

    rows.push({
      professionalId: input.professionalId,
      slug: (pro.slug as string) ?? null,
      name: (pro.name as string) ?? "Adviser",
      firmName: (pro.firm_name as string) ?? null,
      photoUrl: (pro.photo_url as string) ?? null,
      type: (pro.type as string) ?? null,
      specialties: toStringArray(pro.specialties),
      locationDisplay: (pro.location_display as string) ?? null,
      meetingTypes: toStringArray(pro.meeting_types),
      verified: Boolean(pro.verified),
      bookingEnabled: Boolean(pro.booking_enabled),
      bookingLink: (pro.booking_link as string) ?? null,
      acceptingNewClients: pro.accepting_new_clients !== false,
      amountCents: input.amountCents,
      bidId: input.bidId,
      trust,
      responseTime: responseTimes.get(input.professionalId) ?? null,
      outcome: outcomeById.get(input.professionalId) ?? null,
    });
  }

  return rows;
}

/* ─── Scorecard read/write (fail-soft) ─── */

interface ScorecardWriteInput {
  ownerKey: string;
  briefId: number;
  professionalId: number;
  criteria: ScorecardCriteria;
  notes: string | null;
  overall: number | null;
}

export type ScorecardWriteResult =
  | { ok: true; saved: true }
  | { ok: false; reason: "table_missing" | "error" };

/**
 * Postgres "relation does not exist" — the table hasn't been migrated yet.
 * We treat this as a soft failure so the feature degrades instead of 500ing.
 */
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || /does not exist/i.test(err.message ?? "");
}

/**
 * Upsert a single respondent scorecard. Keyed by (owner_key, brief_id,
 * professional_id). Caller MUST have already verified the owner email against
 * the surface (advisor_auctions.contact_email). Fails soft when the table is
 * absent. Never throws.
 */
export async function upsertScorecard(
  input: ScorecardWriteInput,
): Promise<ScorecardWriteResult> {
  const admin = createAdminClient();
  try {
    const { error } = await admin.from("respondent_scorecards").upsert(
      {
        owner_key: input.ownerKey,
        brief_id: input.briefId,
        professional_id: input.professionalId,
        criteria: sanitiseCriteria(input.criteria),
        notes: input.notes,
        overall: input.overall,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_key,brief_id,professional_id" },
    );
    if (error) {
      if (isMissingTable(error)) return { ok: false, reason: "table_missing" };
      log.error("upsertScorecard failed", { error: error.message, code: error.code });
      return { ok: false, reason: "error" };
    }
    return { ok: true, saved: true };
  } catch (err) {
    log.error("upsertScorecard threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "error" };
  }
}

/**
 * Load every scorecard a consumer has saved for a given brief/auction.
 * Returns [] on any failure (including a missing table). Never throws.
 */
export async function listScorecards(
  ownerKey: string,
  briefId: number,
): Promise<RespondentScorecard[]> {
  const key = normaliseOwnerKey(ownerKey);
  if (!key) return [];
  const admin = createAdminClient();
  try {
    const { data, error } = await admin
      .from("respondent_scorecards")
      .select("professional_id, criteria, notes, overall, updated_at")
      .eq("owner_key", key)
      .eq("brief_id", briefId);
    if (error) {
      if (!isMissingTable(error)) {
        log.warn("listScorecards failed", { error: error.message, code: error.code });
      }
      return [];
    }
    return (data ?? []).map((r) => ({
      professionalId: r.professional_id as number,
      criteria: sanitiseCriteria(r.criteria),
      notes: (r.notes as string) ?? null,
      overall: (r.overall as number) ?? null,
      updatedAt: (r.updated_at as string) ?? null,
    }));
  } catch (err) {
    log.warn("listScorecards threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
