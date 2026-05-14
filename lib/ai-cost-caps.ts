/**
 * AI cost caps (V-NEW-06).
 *
 * Two surfaces enforce caps:
 *   - Public concierge (`/api/concierge`)         — IP-keyed
 *   - Admin agent     (`/api/admin/ai-chat`)      — admin-email-keyed
 *
 * Two enforcement layers per surface:
 *   - Per-subject-per-day cap   (envvar AI_USER_DAILY_USD / AI_ADMIN_USER_DAILY_USD)
 *   - Global-per-route-per-day  (envvar AI_GLOBAL_PUBLIC_USD / AI_GLOBAL_ADMIN_USD)
 *
 * Cost is stored as integer micros ($0.000001 each) so DB-side
 * accumulation stays exact and the cap pre-check is a single SUM.
 *
 * Pre-check happens BEFORE the Anthropic call: if today's spend is
 * already at or above the cap, reject with 429. This is best-effort
 * only — under heavy parallel load a subject can race past the cap
 * by the size of one max-tokens response. That overshoot is bounded
 * and accepted; the goal is to bound the blast radius of a runaway
 * loop or abuser, not to enforce penny-perfect accounting.
 *
 * Post-record happens AFTER the stream finishes: increment the
 * row by the actual usage reported by Anthropic. If the row is
 * still under cap but newly past 80%, fire-and-forget an
 * `OPS_ALERT_EMAIL` warning (rate-limited per row per day).
 *
 * Daily reset is implicit: rows are keyed on `day = current UTC
 * date`. A new day means new rows; no cron required.
 */

import { logger } from "@/lib/logger";
// eslint-disable-next-line no-restricted-imports -- ai_token_usage is cross-user (global spend aggregation); site_settings is service-role-only config. Both require admin client per CLAUDE.md scope rules.
import { createAdminClient } from "@/lib/supabase/admin";

const log = logger("ai-cost-caps");

// ─── Pricing ──────────────────────────────────────────────────────
//
// Per-token cost in micro-USD ($0.000001 each), keyed by the
// Anthropic model id we send. Pricing source: anthropic.com/pricing
// snapshot 2026-04-27. Update here when Anthropic changes pricing —
// historical rows keep the cost they were recorded at, since we
// store cost at write time, not at read time.
const PRICING: Record<string, { in: number; out: number }> = {
  // Sonnet 4 (legacy id used by the concierge): $3/MTok in, $15/MTok out
  "claude-sonnet-4-20250514": { in: 3, out: 15 },
  // Sonnet 4.5: $3/MTok in, $15/MTok out
  "claude-sonnet-4-5": { in: 3, out: 15 },
  // Sonnet 4.6: $3/MTok in, $15/MTok out
  "claude-sonnet-4-6": { in: 3, out: 15 },
  // Opus 4.5 / 4.6 / 4.7: $15/MTok in, $75/MTok out
  "claude-opus-4-5": { in: 15, out: 75 },
  "claude-opus-4-6": { in: 15, out: 75 },
  "claude-opus-4-7": { in: 15, out: 75 },
  // Haiku 4.5: $0.80/MTok in, $4/MTok out — ratio kept as integers
  "claude-haiku-4-5-20251001": { in: 0.8, out: 4 },
};

const DEFAULT_PRICING = { in: 3, out: 15 };

/**
 * Compute the cost of a (tokens_in, tokens_out) pair for a given
 * model id. Returns micros (integer-truncated) so the DB column
 * stays exact. Unknown models fall back to Sonnet pricing — better
 * to over-account by a few % than to silently bill at zero.
 */
export function computeCostMicros(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const p = PRICING[model] || DEFAULT_PRICING;
  return Math.round(p.in * tokensIn + p.out * tokensOut);
}

// ─── Cap configuration ───────────────────────────────────────────

/**
 * Resolve a USD-denominated env var into integer micros, with a
 * fallback default (also in dollars). Negative / zero / NaN values
 * are treated as "unset" — the default applies. Centralised here
 * so the parsing rules are uniform across all four caps.
 */
function dollarsEnvToMicros(envValue: string | undefined, defaultUsd: number): number {
  const parsed = envValue !== undefined ? Number.parseFloat(envValue) : NaN;
  const dollars = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultUsd;
  return Math.round(dollars * 1_000_000);
}

export interface RouteConfig {
  route: "concierge" | "admin_agent" | "qa_capture";
  subjectType: "public_session" | "admin_user";
  perSubjectMicros: number;
  globalMicros: number;
  /** Human-readable label shown in 429 responses. */
  label: string;
}

export function loadConciergeConfig(): RouteConfig {
  return {
    route: "concierge",
    subjectType: "public_session",
    perSubjectMicros: dollarsEnvToMicros(process.env.AI_USER_DAILY_USD, 5),
    globalMicros: dollarsEnvToMicros(process.env.AI_GLOBAL_PUBLIC_USD, 200),
    label: "concierge chatbot",
  };
}

export function loadAdminAgentConfig(): RouteConfig {
  return {
    route: "admin_agent",
    subjectType: "admin_user",
    perSubjectMicros: dollarsEnvToMicros(process.env.AI_ADMIN_USER_DAILY_USD, 50),
    globalMicros: dollarsEnvToMicros(process.env.AI_GLOBAL_ADMIN_USD, 100),
    label: "admin AI agent",
  };
}

// QQ-02: Public Q&A answer engine — separate spend budget from the concierge.
// Env vars: AI_QA_USER_DAILY_USD (default $2/IP/day), AI_QA_GLOBAL_USD (default $50/day).
// Note: search_embeddings retrieval uses createAdminClient() — the table has a
// service-role-only RLS policy (no anon/user SELECT). This is acceptable per
// CLAUDE.md admin.ts scope rules (read-only RPC on a service-role-only table).
export function loadQaCaptureConfig(): RouteConfig {
  return {
    route: "qa_capture",
    subjectType: "public_session",
    perSubjectMicros: dollarsEnvToMicros(process.env.AI_QA_USER_DAILY_USD, 2),
    globalMicros: dollarsEnvToMicros(process.env.AI_QA_GLOBAL_USD, 50),
    label: "Q&A answer engine",
  };
}

// ─── Override switch ─────────────────────────────────────────────
//
// Single boolean stored in `site_settings` keyed `ai_cost_caps_disabled`.
// When true, both pre-check verdicts return `allowed`. The override
// is a deliberate audit-logged action; toggling it should always be
// done knowingly via the admin console or `audit_log`.

const OVERRIDE_KEY = "ai_cost_caps_disabled";
const OVERRIDE_TTL_MS = 30_000;
let overrideCache: { at: number; value: boolean } | null = null;

export async function isCapsOverridden(): Promise<boolean> {
  const now = Date.now();
  if (overrideCache && now - overrideCache.at < OVERRIDE_TTL_MS) {
    return overrideCache.value;
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", OVERRIDE_KEY)
      .maybeSingle();
    const value = (data?.value as string | undefined)?.toLowerCase() === "true";
    overrideCache = { at: now, value };
    return value;
  } catch (err) {
    log.warn("override-read-failed (falling back to caps-on)", {
      err: err instanceof Error ? err.message : String(err),
    });
    overrideCache = { at: now, value: false };
    return false;
  }
}

/** Test-only — invalidate the override cache between cases. */
export function _resetOverrideCache(): void {
  overrideCache = null;
}

// ─── Pre-check ───────────────────────────────────────────────────

export type PreCheckVerdict =
  | { allowed: true; perSubjectMicros: number; globalMicros: number }
  | { allowed: false; reason: "per_subject" | "global"; retryAfterSeconds: number };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Seconds until 00:00 UTC tomorrow — the moment new rows start
 * accumulating. Used as the Retry-After header on cap rejections.
 */
function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const tomorrow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
  );
  return Math.max(1, Math.ceil((tomorrow - now.getTime()) / 1000));
}

/**
 * Look up today's spend for this subject (one row read) and the
 * global today total for this route (one indexed sum). Returns
 * either an `allowed` verdict with the current numbers, or a
 * specific rejection reason.
 */
export async function preCheckCaps(
  subjectId: string,
  cfg: RouteConfig,
): Promise<PreCheckVerdict> {
  if (await isCapsOverridden()) {
    return { allowed: true, perSubjectMicros: 0, globalMicros: 0 };
  }
  const supabase = createAdminClient();
  const day = todayUtc();
  const [subjectRes, globalRes] = await Promise.all([
    supabase
      .from("ai_token_usage")
      .select("cost_usd_micros")
      .eq("subject_id", subjectId)
      .eq("subject_type", cfg.subjectType)
      .eq("route", cfg.route)
      .eq("day", day)
      .maybeSingle(),
    supabase
      .from("ai_token_usage")
      .select("cost_usd_micros")
      .eq("route", cfg.route)
      .eq("day", day),
  ]);

  const subjectMicros = (subjectRes.data?.cost_usd_micros as number | undefined) ?? 0;
  const globalMicros =
    (globalRes.data ?? []).reduce<number>(
      (acc, r) => acc + ((r.cost_usd_micros as number | undefined) ?? 0),
      0,
    );

  if (subjectMicros >= cfg.perSubjectMicros) {
    return {
      allowed: false,
      reason: "per_subject",
      retryAfterSeconds: secondsUntilUtcMidnight(),
    };
  }
  if (globalMicros >= cfg.globalMicros) {
    return {
      allowed: false,
      reason: "global",
      retryAfterSeconds: secondsUntilUtcMidnight(),
    };
  }
  return { allowed: true, perSubjectMicros: subjectMicros, globalMicros };
}

// ─── Post-record + 80% alert ─────────────────────────────────────

export interface RecordResult {
  /** New per-subject total after this increment. */
  subjectMicros: number;
  /** True if this increment crossed the 80% threshold for this subject. */
  crossed80Subject: boolean;
}

/**
 * UPSERT today's row by adding the supplied tokens + cost. Returns
 * the new per-subject total and whether it just crossed the 80%
 * threshold (so the caller can decide whether to fire the alert).
 *
 * The "increment" is implemented as a SELECT-then-UPSERT pair. A
 * concurrent second writer can lose a few tokens of accuracy in the
 * read-modify-write window — acceptable since the cap is the
 * dollar-rough kind, not the cent-precise kind.
 */
export async function recordUsage(args: {
  subjectId: string;
  cfg: RouteConfig;
  model: string;
  tokensIn: number;
  tokensOut: number;
}): Promise<RecordResult> {
  const supabase = createAdminClient();
  const day = todayUtc();
  const costMicros = computeCostMicros(args.model, args.tokensIn, args.tokensOut);
  const { data: existing } = await supabase
    .from("ai_token_usage")
    .select("tokens_in, tokens_out, cost_usd_micros, request_count, alerted_80_at")
    .eq("subject_id", args.subjectId)
    .eq("subject_type", args.cfg.subjectType)
    .eq("route", args.cfg.route)
    .eq("day", day)
    .maybeSingle();

  const previousMicros = (existing?.cost_usd_micros as number | undefined) ?? 0;
  const newSubjectMicros = previousMicros + costMicros;

  const threshold80 = Math.floor(args.cfg.perSubjectMicros * 0.8);
  const crossed80Subject =
    previousMicros < threshold80 && newSubjectMicros >= threshold80 &&
    !existing?.alerted_80_at;

  const upsertRow: Record<string, unknown> = {
    subject_id: args.subjectId,
    subject_type: args.cfg.subjectType,
    route: args.cfg.route,
    day,
    tokens_in:
      ((existing?.tokens_in as number | undefined) ?? 0) + args.tokensIn,
    tokens_out:
      ((existing?.tokens_out as number | undefined) ?? 0) + args.tokensOut,
    cost_usd_micros: newSubjectMicros,
    request_count:
      ((existing?.request_count as number | undefined) ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
  if (crossed80Subject) {
    upsertRow.alerted_80_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("ai_token_usage")
    .upsert(upsertRow, {
      onConflict: "subject_id,subject_type,route,day",
    });
  if (error) {
    log.warn("ai_token_usage upsert failed", { err: error.message });
  }
  return { subjectMicros: newSubjectMicros, crossed80Subject };
}

// ─── 429 helper ──────────────────────────────────────────────────

/**
 * Build a friendly 429 response payload + headers from a rejected
 * pre-check verdict. The route handler decides the framework
 * (NextResponse vs new Response) — this just gives the body, status,
 * and Retry-After.
 */
export function capRejectionPayload(
  verdict: Extract<PreCheckVerdict, { allowed: false }>,
  cfg: RouteConfig,
): {
  status: 429;
  body: { error: string; reason: string; retry_after_seconds: number };
  headers: Record<string, string>;
} {
  const friendly =
    verdict.reason === "per_subject"
      ? `You've reached today's daily limit on the ${cfg.label}. It resets at 00:00 UTC. Email support@invest.com.au if you need an exception.`
      : `The ${cfg.label} has hit its global daily budget. Please try again after 00:00 UTC.`;
  return {
    status: 429,
    body: {
      error: friendly,
      reason: verdict.reason,
      retry_after_seconds: verdict.retryAfterSeconds,
    },
    headers: { "Retry-After": String(verdict.retryAfterSeconds) },
  };
}
