/**
 * Open to Offers — anonymised prospect snapshot builder.
 *
 * This is the compliance-critical core of the feature. It assembles the
 * ANONYMISED snapshot that advisers browse, from the consumer's investor
 * profile + their latest quiz history. The snapshot must leak NO identity:
 *
 *   - NO name, email, phone, full address, postcode, suburb, IP.
 *   - State is the finest location granularity (matches the masked brief inbox).
 *   - Budget is a BAND, never a figure.
 *   - No free-text the consumer typed is copied through.
 *
 * Defence in depth:
 *   1. `buildSnapshot` constructs ONLY the allowlisted ProspectSnapshot fields.
 *   2. `scrubSnapshot` runs over the serialised JSON and throws if any banned
 *      key appears at any depth, AND coerces a stray free-form location string
 *      down to a 2-letter state code. The opt-in route persists the *scrubbed*
 *      object, so a future upstream change that started carrying PII can never
 *      silently flow into the pool — it fails loudly instead.
 *
 * Pure-ish: `buildSnapshot` takes already-fetched inputs and returns a value;
 * the DB reads happen in lib/prospect-pool/index.ts. Exported helpers are unit
 * tested against PII-bearing inputs to prove nothing leaks.
 */

import { labelForNeed } from "@/lib/quiz-advisor-types";
import type { InvestorProfile } from "@/lib/investor-profiles";
import type { QuizHistoryRow } from "@/lib/quiz-history";
import {
  type ProspectSnapshot,
  type ProspectBudgetBand,
  type ProspectTimeline,
  type ProspectExperience,
} from "./types";

/** Australian state codes — the only location values the snapshot may carry. */
const AU_STATES: ReadonlySet<string> = new Set([
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

/**
 * Keys that must NEVER appear anywhere in a serialised snapshot. Checked
 * recursively by `scrubSnapshot`. Deliberately broad — better to reject a
 * benign-but-suspicious key than to leak identity.
 */
const BANNED_KEYS: ReadonlySet<string> = new Set([
  "name",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "fullname",
  "full_name",
  "displayname",
  "display_name",
  "email",
  "phone",
  "mobile",
  "tel",
  "contact",
  "contact_name",
  "contact_email",
  "contact_phone",
  "address",
  "street",
  "postcode",
  "post_code",
  "zip",
  "suburb",
  "city",
  "ip",
  "ip_hash",
  "user_id",
  "auth_user_id",
  "session_id",
  "lat",
  "lng",
  "latitude",
  "longitude",
]);

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** Coerce any candidate to a valid AU state code, else null. */
function coerceState(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const upper = s.toUpperCase();
  return AU_STATES.has(upper) ? upper : null;
}

function coerceBudgetBand(v: unknown): ProspectBudgetBand | null {
  return v === "small" || v === "medium" || v === "large" || v === "whale"
    ? v
    : null;
}

function coerceTimeline(v: unknown): ProspectTimeline | null {
  if (v === "asap" || v === "weeks" || v === "research") return v;
  // The find-advisor quiz stores "timeline_<id>" in answers.structured.
  if (typeof v === "string") {
    const id = v.replace(/^timeline_/, "");
    if (id === "asap" || id === "weeks" || id === "research") return id;
  }
  return null;
}

function coerceExperience(v: unknown): ProspectExperience | null {
  return v === "beginner" || v === "intermediate" || v === "pro" ? v : null;
}

/**
 * Map a quiz "goal" token / advisor need to a short plain-language goal line.
 * Static, code-defined — never echoes consumer free-text.
 */
const GOAL_LABELS: Record<string, string> = {
  home: "Buying a first home",
  property: "Investing in property",
  super: "Planning for retirement",
  grow: "Growing wealth / investing",
  income: "Building investment income",
  trade: "Active trading",
  crypto: "Crypto investing",
  business: "Business / SMSF advice",
  "alt-assets": "Alternative assets",
  savings: "Saving and cash management",
  shares: "Investing in shares",
};

function deriveGoal(
  profile: InvestorProfile | null,
  rawAnswers: Record<string, unknown> | null,
): string | null {
  const goalToken = asString(rawAnswers?.goal);
  if (goalToken && GOAL_LABELS[goalToken]) return GOAL_LABELS[goalToken];
  // Fall back to life-event flags (factual, non-advice).
  if (profile?.isFhb) return GOAL_LABELS.home ?? null;
  if (profile?.isPreRetiree) return GOAL_LABELS.super ?? null;
  if (profile?.isBusinessOwner) return GOAL_LABELS.business ?? null;
  if (profile?.isHnw) return GOAL_LABELS.grow ?? null;
  return null;
}

/**
 * Read the advisor-need slug from the latest quiz answers. The find-advisor
 * quiz stores it under answers.structured.advisor_type (and a multi-select
 * `needs` CSV); the get-matched flow under answers.structured.advisor_type too.
 */
function deriveAdvisorNeed(
  rawAnswers: Record<string, unknown> | null,
  structured: Record<string, unknown> | null,
): string | null {
  const fromStructured = asString(structured?.advisor_type);
  if (fromStructured) return fromStructured;
  const needs = asString(structured?.needs);
  if (needs) {
    const first = needs.split(",")[0]?.trim();
    if (first) return first;
  }
  const fromRaw = asString(rawAnswers?.advisor_type);
  return fromRaw;
}

export interface BuildSnapshotInput {
  profile: InvestorProfile | null;
  latestQuiz: QuizHistoryRow | null;
  /**
   * The consumer's state, resolved by the caller from a non-PII source
   * (user_profiles.state). Coerced to a state code; anything finer is dropped.
   */
  stateHint?: string | null;
}

/**
 * Build the anonymised snapshot from already-fetched inputs. Returns ONLY
 * allowlisted fields. Callers MUST pass the result through `scrubSnapshot`
 * before persisting (the opt-in route does this).
 */
export function buildSnapshot(input: BuildSnapshotInput): ProspectSnapshot {
  const { profile, latestQuiz, stateHint } = input;
  const answers = (latestQuiz?.answers ?? null) as Record<string, unknown> | null;
  const rawAnswers =
    (answers?.raw as Record<string, unknown> | undefined) ?? null;
  const structured =
    (answers?.structured as Record<string, unknown> | undefined) ?? null;

  const advisorNeed = deriveAdvisorNeed(rawAnswers, structured);

  // State: prefer the explicit non-PII hint, then a quiz `state` answer. Both
  // are coerced to a 2-letter state code; anything else (postcode/suburb) is
  // dropped to null.
  const state =
    coerceState(stateHint) ??
    coerceState(structured?.state) ??
    coerceState(rawAnswers?.state);

  // Budget band: investor_profiles is canonical; fall back to quiz `amount`.
  const budgetBand =
    coerceBudgetBand(profile?.budgetBand) ??
    coerceBudgetBand(structured?.amount) ??
    coerceBudgetBand(rawAnswers?.amount);

  const timeline =
    coerceTimeline(structured?.timeline) ?? coerceTimeline(rawAnswers?.timeline);

  const experience = coerceExperience(profile?.experienceLevel);

  return {
    advisorType: advisorNeed,
    advisorTypeLabel: advisorNeed ? labelForNeed(advisorNeed) : null,
    goal: deriveGoal(profile, rawAnswers),
    state,
    budgetBand,
    timeline,
    experience,
    crossBorder: profile?.isCrossBorder === true,
    vertical: profile?.primaryVertical ?? null,
    builtAt: new Date().toISOString(),
  };
}

/**
 * Recursively assert no banned (PII) key appears in a value, and that any
 * `state` field is a valid AU state code. Returns the SAME shape on success,
 * throws `SnapshotPiiError` on any violation.
 *
 * This is the last line of defence: the opt-in route persists `scrubSnapshot`'s
 * output, so an upstream regression that introduces PII fails loudly here
 * instead of leaking into the adviser-visible pool.
 */
export class SnapshotPiiError extends Error {
  constructor(public readonly key: string) {
    super(`Snapshot contains a disallowed field: "${key}"`);
    this.name = "SnapshotPiiError";
  }
}

function scrubValue(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) scrubValue(item);
    return;
  }
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (BANNED_KEYS.has(key.toLowerCase())) {
      throw new SnapshotPiiError(key);
    }
    // A `state` field anywhere must be a valid state code (or null/undefined).
    if (key.toLowerCase() === "state" && v != null && coerceState(v) === null) {
      throw new SnapshotPiiError("state(non-state-value)");
    }
    scrubValue(v);
  }
}

export function scrubSnapshot(snapshot: ProspectSnapshot): ProspectSnapshot {
  scrubValue(snapshot);
  return snapshot;
}

/** A one-line human description of a snapshot, for emails / logs (no PII). */
export function describeSnapshot(snapshot: ProspectSnapshot): string {
  const parts: string[] = [];
  if (snapshot.advisorTypeLabel) parts.push(snapshot.advisorTypeLabel);
  if (snapshot.goal) parts.push(snapshot.goal);
  if (snapshot.state) parts.push(snapshot.state);
  return parts.length > 0 ? parts.join(" · ") : "A prospect";
}
