/**
 * Data-access layer for Cohort Challenges.
 *
 * Centralises all DB reads/writes so pages, API routes, and the cron stay thin
 * and consistent. Everything is FAIL-SOFT: the feature is dormant behind the
 * `cohort_challenges` flag and the tables may be absent at merge time, so reads
 * return empty/neutral values and writes return a typed error rather than
 * throwing 500s.
 *
 * Client choice (per CLAUDE.md "Two Supabase clients"):
 *   - Public challenge reads use the user-cookie `createClient()` (anon SELECT
 *     policy covers `challenges`).
 *   - Per-user enrolment/completion reads+writes use `createClient()` so RLS
 *     scopes them to `auth.uid()`.
 *   - Cohort-wide aggregate COUNTs are a legitimate cross-user read that cannot
 *     be scoped to one `auth.uid()`, so they use the service-role admin client
 *     (documented allowed scope). They return COUNT-only data — never
 *     identities — and the caller suppresses small buckets.
 */

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-user cohort aggregates (getCohortAggregate / getEnrolledCount COUNT across all enrolees; cannot be scoped to one auth.uid()); COUNT-only, never selects identities. Documented exception in CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { getCurriculum, taskKeySet } from "./progress";
import type { ChallengeCurriculum } from "./curricula";

const log = logger("challenges:data");

export const COHORT_CHALLENGES_FLAG = "cohort_challenges";

/** Is the Cohort Challenges feature live? Fail-closed (flag helper is fail-open
 *  internally, but the flag defaults to disabled until launch). */
export async function challengesEnabled(): Promise<boolean> {
  return isFlagEnabled(COHORT_CHALLENGES_FLAG);
}

// ── Row shapes (local types — we do NOT edit lib/database.types.ts) ───────────

export interface ChallengeRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  curriculum_key: string;
  starts_at: string | null;
  ends_at: string | null;
  enrolment_open: boolean;
  max_cohort: number | null;
  club_id: string | null;
  created_at: string;
}

export interface EnrolmentRow {
  id: string;
  challenge_id: string;
  user_id: string;
  status: "enrolled" | "waitlisted";
  enrolled_at: string;
  completed_at: string | null;
  certificate_id: string | null;
  certificate_issued_at: string | null;
  last_nudge_on: string | null;
}

const CHALLENGE_COLS =
  "id, slug, title, description, curriculum_key, starts_at, ends_at, enrolment_open, max_cohort, club_id, created_at";
const ENROLMENT_COLS =
  "id, challenge_id, user_id, status, enrolled_at, completed_at, certificate_id, certificate_issued_at, last_nudge_on";

/** A challenge plus its resolved code curriculum. Challenges whose
 *  `curriculum_key` has no matching code curriculum are dropped (defensive). */
export interface ChallengeWithCurriculum {
  challenge: ChallengeRow;
  curriculum: ChallengeCurriculum;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** All challenges (public read), newest cohort first, joined to their curricula. */
export async function listChallenges(): Promise<ChallengeWithCurriculum[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("challenges")
      .select(CHALLENGE_COLS)
      .order("starts_at", { ascending: true, nullsFirst: false });
    if (error) {
      log.warn("listChallenges failed", { error: error.message });
      return [];
    }
    return ((data as ChallengeRow[] | null) ?? [])
      .map((challenge) => {
        const curriculum = getCurriculum(challenge.curriculum_key);
        return curriculum ? { challenge, curriculum } : null;
      })
      .filter((x): x is ChallengeWithCurriculum => x !== null);
  } catch (err) {
    log.warn("listChallenges threw (tables likely absent)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** A single challenge by slug, joined to its curriculum, or null. */
export async function getChallengeBySlug(
  slug: string,
): Promise<ChallengeWithCurriculum | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("challenges")
      .select(CHALLENGE_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      if (error) log.warn("getChallengeBySlug failed", { error: error.message });
      return null;
    }
    const challenge = data as ChallengeRow;
    const curriculum = getCurriculum(challenge.curriculum_key);
    return curriculum ? { challenge, curriculum } : null;
  } catch (err) {
    log.warn("getChallengeBySlug threw (tables likely absent)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** The signed-in user's enrolment for a challenge, or null. RLS-scoped. */
export async function getMyEnrolment(
  challengeId: string,
): Promise<EnrolmentRow | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("challenge_enrolments")
      .select(ENROLMENT_COLS)
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      log.warn("getMyEnrolment failed", { error: error.message });
      return null;
    }
    return (data as EnrolmentRow | null) ?? null;
  } catch (err) {
    log.warn("getMyEnrolment threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** The set of task keys the signed-in user has completed for an enrolment. */
export async function getMyCompletedTaskKeys(
  enrolmentId: string,
): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("challenge_task_completions")
      .select("task_key")
      .eq("enrolment_id", enrolmentId);
    if (error) {
      log.warn("getMyCompletedTaskKeys failed", { error: error.message });
      return new Set();
    }
    return new Set(((data as { task_key: string }[] | null) ?? []).map((r) => r.task_key));
  } catch (err) {
    log.warn("getMyCompletedTaskKeys threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Set();
  }
}

export interface CohortAggregateData {
  /** Number of enrolled (non-waitlisted) participants. */
  cohortSize: number;
  /** day → count of participants who completed that day's task. */
  completionsByDay: Map<number, number>;
}

/**
 * Cohort-wide anonymised completion COUNTS.
 *
 * Service-role read (cross-user aggregate that can't be scoped to one
 * `auth.uid()` — documented allowed scope). Returns counts only; identities are
 * never selected. The caller (page/cron) applies the n<5 suppression via
 * `cohortDayAggregates`.
 */
export async function getCohortAggregate(
  challenge: ChallengeRow,
  curriculum: ChallengeCurriculum,
): Promise<CohortAggregateData> {
  const empty: CohortAggregateData = { cohortSize: 0, completionsByDay: new Map() };
  try {
    const admin = createAdminClient();

    // Enrolled (non-waitlisted) participant ids for this cohort.
    const { data: enrolments, error: enrErr } = await admin
      .from("challenge_enrolments")
      .select("id")
      .eq("challenge_id", challenge.id)
      .eq("status", "enrolled");
    if (enrErr) {
      log.warn("getCohortAggregate enrolments failed", { error: enrErr.message });
      return empty;
    }
    const enrolmentIds = ((enrolments as { id: string }[] | null) ?? []).map((e) => e.id);
    const cohortSize = enrolmentIds.length;
    if (cohortSize === 0) return empty;

    // map task_key → day for this curriculum.
    const keyToDay = new Map<string, number>();
    for (const t of curriculum.tasks) keyToDay.set(t.key, t.day);
    const validKeys = taskKeySet(curriculum);

    // All completions for these enrolments. COUNT-only aggregate by day.
    const { data: completions, error: compErr } = await admin
      .from("challenge_task_completions")
      .select("task_key")
      .in("enrolment_id", enrolmentIds);
    if (compErr) {
      log.warn("getCohortAggregate completions failed", { error: compErr.message });
      return { cohortSize, completionsByDay: new Map() };
    }

    const completionsByDay = new Map<number, number>();
    for (const row of (completions as { task_key: string }[] | null) ?? []) {
      if (!validKeys.has(row.task_key)) continue;
      const day = keyToDay.get(row.task_key);
      if (day == null) continue;
      completionsByDay.set(day, (completionsByDay.get(day) ?? 0) + 1);
    }
    return { cohortSize, completionsByDay };
  } catch (err) {
    log.warn("getCohortAggregate threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}

/**
 * Count of enrolled (non-waitlisted) participants for a cohort. Service-role
 * COUNT (cross-user aggregate). Used to render "N investors enrolled" and to
 * enforce `max_cohort` at enrol time.
 */
export async function getEnrolledCount(challengeId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("challenge_enrolments")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", challengeId)
      .eq("status", "enrolled");
    if (error) {
      log.warn("getEnrolledCount failed", { error: error.message });
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    log.warn("getEnrolledCount threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}
