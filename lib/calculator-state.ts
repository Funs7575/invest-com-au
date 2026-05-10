/**
 * Cross-calculator state — hybrid sessionStorage + DB.
 *
 * Foundation for CMP W1-A (calculator continuity). Anonymous users get
 * sessionStorage-only persistence (zero-RTT prefill, dies on cookie clear).
 * Signed-in users get write-through to `user_calculator_state` for cross-device.
 * Anonymous-pre-signup state is held in `anonymous_saves.calculator_state` and
 * claimed on signup via the existing claimAnonymousSaves pattern.
 *
 * The single-calculator shape (`source` / `data` / `captured_at`) intentionally
 * matches QualificationData in lib/qualification-store.ts so reader code at
 * /api/submit-lead doesn't need to fork.
 */

import type { QualificationData } from "@/lib/qualification-store";
import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("calculator-state");

const SESSION_KEY = "calculator_state_map";

/** Map keyed by calculator slug (e.g. "tco", "savings", "mortgage") → its last entry. */
export type CalculatorStateMap = Record<string, QualificationData>;

// ─── Browser side (sessionStorage) ────────────────────────────────

export function readSessionState(): CalculatorStateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CalculatorStateMap;
  } catch {
    return {};
  }
}

export function writeSessionState(
  calculatorKey: string,
  payload: Pick<QualificationData, "source" | "data">,
): void {
  if (typeof window === "undefined") return;
  try {
    const current = readSessionState();
    const next: CalculatorStateMap = {
      ...current,
      [calculatorKey]: {
        source: payload.source,
        data: payload.data,
        captured_at: new Date().toISOString(),
      },
    };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable (private browsing / quota) — silent
  }
}

export function clearSessionState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ─── Server side (Supabase) ───────────────────────────────────────

export async function readDbState(userId: string): Promise<CalculatorStateMap> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_calculator_state")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    const raw = (data as { state?: unknown } | null)?.state;
    if (!raw || typeof raw !== "object") return {};
    return raw as CalculatorStateMap;
  } catch (err) {
    log.warn("readDbState threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return {};
  }
}

/**
 * Upsert one calculator's entry into user_calculator_state. JSONB merge on
 * conflict so partial writes from one calculator don't clobber another's.
 */
export async function writeDbState(
  userId: string,
  calculatorKey: string,
  payload: Pick<QualificationData, "source" | "data">,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    // Build the merge fragment server-side so PostgREST can do the JSONB
    // concat in one round-trip. We READ the current row first to merge, then
    // write — RLS on user_calculator_state restricts to auth.uid()=user_id.
    const current = await readDbState(userId);
    const merged: CalculatorStateMap = {
      ...current,
      [calculatorKey]: {
        source: payload.source,
        data: payload.data,
        captured_at: new Date().toISOString(),
      },
    };
    const { error } = await supabase
      .from("user_calculator_state")
      .upsert(
        {
          user_id: userId,
          state: merged as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) {
      log.warn("user_calculator_state upsert failed", {
        userId,
        calculatorKey,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("writeDbState threw", {
      userId,
      calculatorKey,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ─── Anonymous claim path (called from signup flow) ───────────────

/**
 * On signup: read anonymous_saves.calculator_state for this session, merge
 * into user_calculator_state.state via JSONB concat. Idempotent — re-running
 * is a no-op because the merge target wins on duplicate keys (LWW by
 * captured_at when both sides have an entry for the same calculator).
 *
 * Returns the count of calculator entries claimed (0 if none).
 */
export async function claimAnonymousCalculatorState(
  sessionId: string,
  userId: string,
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data: anonRow } = await supabase
      .from("anonymous_saves")
      .select("calculator_state")
      .eq("session_id", sessionId)
      .is("claimed_at", null)
      .maybeSingle();
    const anonState =
      (anonRow as { calculator_state?: unknown } | null)?.calculator_state;
    if (!anonState || typeof anonState !== "object") return 0;
    const incoming = anonState as CalculatorStateMap;
    const incomingKeys = Object.keys(incoming);
    if (incomingKeys.length === 0) return 0;

    const existing = await readDbState(userId);

    // Last-write-wins by captured_at when both sides have the same key
    const merged: CalculatorStateMap = { ...existing };
    for (const key of incomingKeys) {
      const incomingEntry = incoming[key];
      if (!incomingEntry) continue;
      const existingEntry = existing[key];
      if (
        !existingEntry ||
        new Date(incomingEntry.captured_at).getTime() >
          new Date(existingEntry.captured_at).getTime()
      ) {
        merged[key] = incomingEntry;
      }
    }

    const { error } = await supabase
      .from("user_calculator_state")
      .upsert(
        {
          user_id: userId,
          state: merged as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) {
      log.warn("claim user_calculator_state upsert failed", {
        userId,
        error: error.message,
      });
      return 0;
    }
    log.info("Claimed calculator state", {
      userId,
      claimedKeys: incomingKeys.length,
    });
    return incomingKeys.length;
  } catch (err) {
    log.warn("claimAnonymousCalculatorState threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

// ─── Cross-calc prefill mapping ───────────────────────────────────

/**
 * When calc B mounts, ask which fields it can prefill from prior state.
 * Mapping is intentionally explicit (and small) rather than inferred — keeps
 * compliance review tractable: every flow of user input from one surface to
 * another is named and reviewable.
 *
 * Reader pattern (in calc B):
 *   const state = mergeStates(readSessionState(), dbState);
 *   const prefill = getPrefillFor("tco", state);
 *   // prefill = { monthly_trades?: number, us_pct?: number, ... }
 */
export interface PrefillRule {
  /** Which calculator's data to read FROM. */
  fromCalculator: string;
  /** Field on the source's `data` blob. */
  fromField: string;
  /** Field name as the destination calculator expects it. */
  toField: string;
}

export const PREFILL_RULES: Record<string, PrefillRule[]> = {
  // TCO calculator can prefill from savings + mortgage calcs
  tco: [
    { fromCalculator: "savings_calculator", fromField: "monthly_contribution", toField: "monthly_amount" },
    { fromCalculator: "savings_calculator", fromField: "horizon_years", toField: "horizon_years" },
    { fromCalculator: "mortgage_calculator", fromField: "annual_income", toField: "annual_income" },
  ],
  // Mortgage calculator can prefill from savings (deposit) + borrowing-power
  mortgage_calculator: [
    { fromCalculator: "savings_calculator", fromField: "current_balance", toField: "deposit" },
    { fromCalculator: "borrowing_power_calculator", fromField: "annual_income", toField: "annual_income" },
  ],
  // Borrowing-power can prefill from savings deposit
  borrowing_power_calculator: [
    { fromCalculator: "savings_calculator", fromField: "current_balance", toField: "deposit" },
  ],
};

export function getPrefillFor(
  destinationCalculator: string,
  state: CalculatorStateMap,
): Record<string, unknown> {
  const rules = PREFILL_RULES[destinationCalculator] ?? [];
  const out: Record<string, unknown> = {};
  for (const rule of rules) {
    const sourceEntry = state[rule.fromCalculator];
    if (!sourceEntry) continue;
    const value = sourceEntry.data[rule.fromField];
    if (value === undefined || value === null || value === "") continue;
    // Only fill if not already set by an earlier rule (first-wins for stability).
    if (!(rule.toField in out)) {
      out[rule.toField] = value;
    }
  }
  return out;
}

/**
 * Merge two state maps with last-write-wins by captured_at per calculator key.
 * Used to reconcile sessionStorage (fast) with DB (canonical).
 */
export function mergeStates(
  ...inputs: CalculatorStateMap[]
): CalculatorStateMap {
  const out: CalculatorStateMap = {};
  for (const map of inputs) {
    for (const key of Object.keys(map)) {
      const incoming = map[key];
      if (!incoming) continue;
      const existing = out[key];
      if (
        !existing ||
        new Date(incoming.captured_at).getTime() >
          new Date(existing.captured_at).getTime()
      ) {
        out[key] = incoming;
      }
    }
  }
  return out;
}

// ─── URL serialization (for shareable prefilled links) ────────────

/**
 * Serialize one calculator's data into URL search params with a `<key>_`
 * prefix. Lets a CTA like "See yearly TCO" navigate to
 * /tco-calculator?tco_monthly_trades=12&tco_us_pct=40 for instant prefill.
 */
export function serializeToUrlParams(
  calculatorKey: string,
  data: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(`${calculatorKey}_${k}`, String(v));
  }
  return params;
}

export function parseFromUrlParams(
  calculatorKey: string,
  searchParams: URLSearchParams,
): Record<string, unknown> {
  const prefix = `${calculatorKey}_`;
  const out: Record<string, unknown> = {};
  for (const [k, v] of searchParams.entries()) {
    if (!k.startsWith(prefix)) continue;
    out[k.slice(prefix.length)] = v;
  }
  return out;
}
