/**
 * Scenario Workspace — shared types, the calculator registry, and the
 * share-token generator for named calculator scenarios.
 *
 * What this is
 * ------------
 * A "scenario" is a NAMED snapshot of a single calculator's inputs (plus an
 * optional pre-computed results snapshot for list display). Users save several
 * per calculator ("Aggressive DCA", "If we refinance"), reopen them, compare
 * 2-3 of the same `calculator_key` side-by-side, and share a read-only link.
 *
 * Relationship to `user_calculator_state`
 * ----------------------------------------
 * `useCalculatorState` (hooks/use-calculator-state.ts) persists only the LATEST
 * inputs per calculator. Scenarios layer NAMED snapshots on top — a separate
 * `user_scenarios` table (one row per saved scenario). Loading a scenario back
 * into a calculator round-trips through the SAME mechanism: we hand the inputs
 * to the calculator via the URL-param handoff (`serializeToUrlParams`), so the
 * existing `useCalculatorState` hydration picks them up with zero new glue.
 *
 * Flag gating
 * -----------
 * Everything user-facing is behind the `scenario_workspace` feature flag and
 * fails closed (flag off / DB error → false → no UI, API 404/501). See
 * `lib/feature-flags.ts` (`isFlagEnabled`).
 *
 * AFSL scope
 * ----------
 * Saved inputs/snapshots are the user's own figures echoed back. Any compare or
 * shared surface that renders projections MUST show `GENERAL_ADVICE_WARNING`
 * from `lib/compliance.ts`. Neutral delta language only (see lib/scenario-delta).
 *
 * No I/O here beyond `randomBytes` — pure types + lookup tables so this module
 * is safe to import from server, client, and tests.
 */

import { randomBytes } from "crypto";

/** Feature-flag key gating the entire Scenario Workspace. */
export const SCENARIO_WORKSPACE_FLAG = "scenario_workspace";

/** Maximum scenarios a single user may keep (across all calculators). */
export const MAX_SCENARIOS_PER_USER = 50;

/** Max length of a scenario name — mirrors the DB CHECK (char_length <= 80). */
export const SCENARIO_NAME_MAX = 80;

// ─── Row type (local — do NOT add to lib/database.types.ts per task rules) ────

/**
 * A row of `public.user_scenarios`. `inputs` / `results_snapshot` are opaque
 * JSON blobs whose shape is the owning calculator's concern, so they are typed
 * as `Record<string, unknown>` here.
 */
export interface ScenarioRow {
  id: string;
  user_id: string;
  calculator_key: string;
  name: string;
  inputs: Record<string, unknown>;
  results_snapshot: Record<string, unknown> | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Owner-facing view of a scenario — what the account UI and CRUD API return.
 * Identical columns to `ScenarioRow` minus `user_id` (never sent to the
 * client; ownership is enforced server-side by RLS).
 */
export type ScenarioOwnerView = Omit<ScenarioRow, "user_id">;

/** Columns selected for owner reads — keep in sync with `ScenarioOwnerView`. */
export const SCENARIO_OWNER_COLUMNS =
  "id, calculator_key, name, inputs, results_snapshot, share_token, created_at, updated_at";

/**
 * Public (shared-link) projection of a scenario. Deliberately excludes
 * `user_id`, `share_token` echo, and timestamps that could fingerprint the
 * owner. This is the ONLY shape exposed by the public share route/page.
 */
export interface ScenarioPublicView {
  name: string;
  calculator_key: string;
  inputs: Record<string, unknown>;
  results_snapshot: Record<string, unknown> | null;
}

/** Columns selected for the public share read — no owner identity. */
export const SCENARIO_PUBLIC_COLUMNS =
  "name, calculator_key, inputs, results_snapshot";

/** Map a full owner row to the owner view (strip `user_id`). */
export function toOwnerView(row: ScenarioRow): ScenarioOwnerView {
  const { user_id: _userId, ...rest } = row;
  void _userId;
  return rest;
}

// ─── Share token ──────────────────────────────────────────────────────────────

/**
 * 192-bit opaque share token (48 hex chars). Matches the established pattern
 * (`lib/getmatched/action-plans.ts` → `newShareToken`, profile-share tokens):
 * the token is the only auth factor on the public read surface.
 */
export function newScenarioShareToken(): string {
  return randomBytes(24).toString("hex");
}

/** Minimum length the public route requires before it bothers querying. */
export const SCENARIO_SHARE_TOKEN_MIN_LENGTH = 32;

// ─── Calculator registry ──────────────────────────────────────────────────────

export interface CalculatorMeta {
  /** The `useCalculatorState` key / `calculator_key` value. */
  key: string;
  /** Human label for list grouping + headers. */
  label: string;
  /** `components/Icon` name (validated against the known set). */
  icon: string;
  /** Canonical page path the scenario opens into ("open in calculator"). */
  href: string;
}

/**
 * The set of calculators that opt into scenario saving, keyed by their
 * `useCalculatorState` key. There is no pre-existing single registry in the
 * codebase (keys are free-form strings passed to the hook), so this is the
 * single source of truth for label + icon + "open in calculator" href.
 *
 * Adding a calculator to the workspace = add a row here AND pass the matching
 * `<ScenarioBar calculatorKey=... />` (or `scenario` prop on CalculatorShell)
 * on that calculator's page. Keys map to the values already used in
 * `useCalculatorState(...)` calls and `lib/calculator-state.ts` PREFILL_RULES.
 */
export const CALCULATOR_REGISTRY: Record<string, CalculatorMeta> = {
  super_contributions_calculator: {
    key: "super_contributions_calculator",
    label: "Super Contributions Calculator",
    icon: "coins",
    href: "/super-contributions-calculator",
  },
  mortgage_calculator: {
    key: "mortgage_calculator",
    label: "Mortgage Calculator",
    icon: "home",
    href: "/mortgage-calculator",
  },
  savings_calculator: {
    key: "savings_calculator",
    label: "Savings Calculator",
    icon: "piggy-bank",
    href: "/savings-calculator",
  },
  retirement_calculator: {
    key: "retirement_calculator",
    label: "Retirement Calculator",
    icon: "target",
    href: "/retirement-calculator",
  },
  fire_calculator: {
    key: "fire_calculator",
    label: "FIRE Calculator",
    icon: "flame",
    href: "/fire-calculator",
  },
  compound_interest_calculator: {
    key: "compound_interest_calculator",
    label: "Compound Interest Calculator",
    icon: "bar-chart",
    href: "/compound-interest-calculator",
  },
  property_vs_shares_calculator: {
    key: "property_vs_shares_calculator",
    label: "Property vs Shares Calculator",
    icon: "pie-chart",
    href: "/property-vs-shares-calculator",
  },
  debt_calculator: {
    key: "debt_calculator",
    label: "Debt Calculator",
    icon: "credit-card",
    href: "/debt-calculator",
  },
  portfolio_calculator: {
    key: "portfolio_calculator",
    label: "Portfolio Calculator",
    icon: "pie-chart",
    href: "/portfolio-calculator",
  },
  smsf_calculator: {
    key: "smsf_calculator",
    label: "SMSF Calculator",
    icon: "coins",
    href: "/smsf-calculator",
  },
};

/** Fallback meta for an unknown `calculator_key` (forward-compatible). */
export function calculatorMetaFor(key: string): CalculatorMeta {
  const known = CALCULATOR_REGISTRY[key];
  if (known) return known;
  return {
    key,
    label: humaniseKey(key),
    icon: "calculator",
    href: "/calculators",
  };
}

/** "mortgage_calculator" → "Mortgage Calculator" (registry-miss fallback). */
function humaniseKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ─── Open-in-calculator deep link ──────────────────────────────────────────────

/**
 * Build the "open this scenario in the calculator" URL using the established
 * `<key>_<field>=<value>` handoff that `useCalculatorState` reads on mount (see
 * `lib/calculator-state.ts` parseFromUrlParams), so loading a saved scenario
 * needs NO new hydration code on the calculator side.
 *
 * NB: the format mirrors `serializeToUrlParams`, but we re-implement it inline
 * rather than import it — `lib/calculator-state.ts` pulls in `supabase/admin`
 * (server-only) at module scope, and this module is deliberately client-safe
 * (ScenarioBar / ScenarioLibraryClient import it). Keep the two in sync.
 *
 * Pure function — only flat scalar inputs are encoded (objects/arrays skipped),
 * matching the hook's URL contract.
 */
export function openInCalculatorHref(
  calculatorKey: string,
  inputs: Record<string, unknown>,
): string {
  const meta = calculatorMetaFor(calculatorKey);
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(inputs)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") continue; // hook only round-trips scalars
    params.set(`${calculatorKey}_${field}`, String(value));
  }
  const qs = params.toString();
  return qs ? `${meta.href}?${qs}` : meta.href;
}
