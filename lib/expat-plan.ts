/**
 * Expat Plan — transforms a built ExpatJourney into a trackable checklist plan.
 *
 * Design intent:
 *   • Each JourneyStep becomes a PlanItem with a stable `id` (matches the
 *     step's own `id`), the step's heading/summary, and an optional array
 *     of `detail` bullets drawn from the step's bullets/links for deeper
 *     in-plan context (particularly FX-corridor options and pension rules
 *     where config supplies richer data).
 *   • Progress state (`done` per item) is held externally (in
 *     localStorage for anonymous users, and via /api/expat-plan for
 *     signed-in users). This module only computes the plan structure and
 *     completion math — it never reads or writes persistence.
 *   • `buildExpatPlan` is a PURE function — same input always gives same
 *     output. Designed for fast test iteration.
 *   • `computeCompletion` is intentionally separate from the build step
 *     so the client component can call it any time progress changes
 *     without rebuilding the full plan.
 *
 * FX / pension deepening:
 *   Where the country config supplies fxCorridor or retirementTransfer
 *   data the plan surfaces an enriched `detail` list on those items —
 *   specifically the FX option costs/speeds and the pension key rules —
 *   so the planner view is genuinely richer than the static journey page
 *   without fabricating any data.
 *
 * Compliance:
 *   All copy is factual / general in nature. No personal recommendations,
 *   no product rankings, no fabricated rules. AFSL general-advice scope.
 *
 * Tests: __tests__/lib/expat-plan.test.ts
 */

import type { CountryConfig } from "./foreign-investment-country-data";
import type { IntentCountryCode } from "./intent-context";
import { intentCountryMeta } from "./intent-context";
import { buildExpatJourney, type ExpatJourney, type JourneyStep } from "./expat-journey";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A single checklist item in the cross-border plan.
 * `id` mirrors the journey step id — stable across rebuilds.
 */
export interface PlanItem {
  /** Stable id matching the source JourneyStep id (e.g. "eligibility", "firb"). */
  id: string;
  /** Step number (1-based, same as journey). */
  stepNumber: number;
  /** Short label for the progress rail and checklist header. */
  railLabel: string;
  /** Full heading (same as journey heading). */
  heading: string;
  /** 1–2 sentence summary of what this item covers. */
  summary: string;
  /**
   * Enriched detail bullets surfaced from the step's factual data.
   * May include FX option specifics, pension key rules, or reporting
   * obligation bullets depending on what the country config supplies.
   * Always drawn from existing config — never fabricated.
   */
  detail: ReadonlyArray<string>;
  /** Links to existing calculators/pages for this step. */
  links: ReadonlyArray<{ label: string; href: string; primary?: boolean }>;
  /** Optional callout (critical/warn) from the source step. */
  calloutTitle?: string;
  calloutBody?: string;
  calloutVariant?: "warn" | "critical";
  /**
   * Category used for visual grouping in the planner UI.
   * Derived from step id — "setup", "compliance", "financial", "action".
   */
  category: PlanItemCategory;
}

export type PlanItemCategory = "setup" | "compliance" | "financial" | "action";

/** The full plan for one country. */
export interface ExpatPlan {
  /** Two-letter intent code. */
  code: IntentCountryCode;
  /** Canonical country name. */
  countryName: string;
  /** Short label (e.g. "UK"). */
  countryShort: string;
  /** Emoji flag. */
  flag: string;
  /** ISO 4217 home currency. */
  currency: string;
  /** Ordered checklist items. Length always >= 2 (eligibility + handoff). */
  items: ReadonlyArray<PlanItem>;
  /**
   * ISO 8601 date when the plan was last built.
   * Used by the client to detect stale cached plans.
   */
  builtAt: string;
  /**
   * Extra FX detail surfaced when fxCorridor is present in the config.
   * Allows the plan to show repatriation context without cluttering the
   * PlanItem bullet list.
   */
  fxSummary?: FxSummary;
  /**
   * Extra pension detail surfaced when retirementTransfer is present.
   * Structured so the planner can render it as a highlighted callout.
   */
  pensionSummary?: PensionSummary;
}

/** Structured FX corridor summary derived from CountryConfig.fxCorridor. */
export interface FxSummary {
  eyebrow: string;
  title: string;
  sub: string;
  /** Best option name + cost (cheapest by badge/name). */
  bestOptionLabel: string;
  bestOptionCost: string;
  /** Link to compare page. */
  ctaLabel: string;
  ctaHref: string;
}

/** Structured pension summary derived from CountryConfig.retirementTransfer. */
export interface PensionSummary {
  title: string;
  sub: string;
  /** High-risk callout text (from config.retirementTransfer.callout). */
  callout?: string;
  /** Key rule bullet points from the first accordion. */
  keyRules: ReadonlyArray<string>;
}

/** Persisted progress for one country's plan. Stored externally (localStorage / DB). */
export interface ExpatPlanProgress {
  /** Which item ids have been marked done. */
  doneIds: ReadonlyArray<string>;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** Completion result. */
export interface PlanCompletion {
  /** Number of items marked done. */
  doneCount: number;
  /** Total number of items. */
  totalCount: number;
  /** Percentage 0–100 (integer). */
  percent: number;
  /** True when every item is done. */
  complete: boolean;
}

// ─── Category mapping ────────────────────────────────────────────────────────

const CATEGORY_BY_STEP_ID: Record<string, PlanItemCategory> = {
  eligibility: "setup",
  firb: "compliance",
  "investment-options": "financial",
  tax: "compliance",
  fx: "financial",
  pension: "financial",
  reporting: "compliance",
  migration: "setup",
  handoff: "action",
};

function categoryFor(stepId: string): PlanItemCategory {
  return CATEGORY_BY_STEP_ID[stepId] ?? "action";
}

// ─── Detail enrichment ───────────────────────────────────────────────────────

/**
 * Build enriched detail bullets for a PlanItem.
 *
 * For most steps this mirrors the journey step bullets (already factual).
 * For "fx" and "pension" we overlay structured config data to give the
 * planner view richer context than the journey's narrative summary.
 */
function buildDetailBullets(
  step: JourneyStep,
  config: CountryConfig,
): ReadonlyArray<string> {
  // FX step — lead with corridor-specific cost options
  if (step.id === "fx" && config.fxCorridor) {
    const fx = config.fxCorridor;
    const optionBullets = fx.options.map(
      (opt) =>
        `**${opt.name}** [${opt.badge}]: ${opt.cost} — ${opt.speed}. ${opt.note}`,
    );
    return [
      `**Corridor**: ${fx.eyebrow}`,
      ...optionBullets,
      `**Key insight**: ${fx.sub}`,
    ];
  }

  // Pension step — lead with critical rules from the first accordion
  if (step.id === "pension" && config.retirementTransfer) {
    const ret = config.retirementTransfer;
    const firstAccordion = ret.accordions[0];
    const ruleBullets = firstAccordion ? firstAccordion.bullets.slice(0, 4) : [];
    const detail: string[] = [
      `**What this covers**: ${ret.sub}`,
      ...ruleBullets,
    ];
    if (ret.callout) {
      detail.push(`**Warning**: ${ret.callout}`);
    }
    return detail;
  }

  // Reporting step — surface key obligation bullets
  if (step.id === "reporting" && config.reportingObligations) {
    const rep = config.reportingObligations;
    const detail: string[] = [`**Overview**: ${rep.sub}`];
    for (const card of rep.cards) {
      detail.push(`**${card.title}**:`);
      detail.push(...card.bullets.slice(0, 2));
    }
    return detail;
  }

  // Default — use the step's own bullets (already factual, max 6 to avoid
  // repetition with the journey page)
  return step.bullets.slice(0, 6);
}

// ─── FX / pension summary builders ──────────────────────────────────────────

function buildFxSummary(config: CountryConfig): FxSummary | undefined {
  if (!config.fxCorridor) return undefined;
  const fx = config.fxCorridor;

  // Find the "Recommended" or cheapest badge option as the headline
  const best =
    fx.options.find((o) => o.badgeAccent === "emerald") ?? fx.options[0];

  if (!best) return undefined;

  return {
    eyebrow: fx.eyebrow,
    title: fx.title,
    sub: fx.sub,
    bestOptionLabel: best.name,
    bestOptionCost: best.cost,
    ctaLabel: fx.ctaLabel,
    ctaHref: fx.ctaHref,
  };
}

function buildPensionSummary(config: CountryConfig): PensionSummary | undefined {
  if (!config.retirementTransfer) return undefined;
  const ret = config.retirementTransfer;

  const firstAccordion = ret.accordions[0];
  const keyRules: ReadonlyArray<string> = firstAccordion
    ? firstAccordion.bullets
    : [];

  return {
    title: ret.title,
    sub: ret.sub,
    callout: ret.callout,
    keyRules,
  };
}

// ─── Plan item builder ───────────────────────────────────────────────────────

function buildPlanItem(step: JourneyStep, config: CountryConfig): PlanItem {
  return {
    id: step.id,
    stepNumber: step.stepNumber,
    railLabel: step.railLabel,
    heading: step.heading,
    summary: step.summary,
    detail: buildDetailBullets(step, config),
    links: step.links,
    calloutTitle: step.calloutTitle,
    calloutBody: step.calloutBody,
    calloutVariant: step.calloutVariant,
    category: categoryFor(step.id),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build an ExpatPlan from a CountryConfig.
 *
 * Internally calls `buildExpatJourney` to get the ordered step list, then
 * converts each step into a PlanItem with enriched detail. Overlays
 * fxSummary and pensionSummary when the config supports them.
 *
 * @param config — from COUNTRY_CONFIGS[code] or getCountryConfig(code)
 * @returns ExpatPlan with ordered checklist items
 */
export function buildExpatPlan(config: CountryConfig): ExpatPlan {
  const journey: ExpatJourney = buildExpatJourney(config);
  const meta = intentCountryMeta(config.code);

  const items = journey.steps.map((step) => buildPlanItem(step, config));

  return {
    code: config.code,
    countryName: config.countryName,
    countryShort: config.countryShort,
    flag: meta.flag,
    currency: meta.currency,
    items,
    builtAt: new Date().toISOString(),
    fxSummary: buildFxSummary(config),
    pensionSummary: buildPensionSummary(config),
  };
}

/**
 * Compute completion stats for a plan given a set of done item ids.
 *
 * @param plan — the ExpatPlan (or just an items array)
 * @param doneIds — set of item ids the user has marked done
 * @returns PlanCompletion with doneCount, totalCount, percent, complete
 */
export function computeCompletion(
  plan: Pick<ExpatPlan, "items">,
  doneIds: ReadonlyArray<string>,
): PlanCompletion {
  const totalCount = plan.items.length;
  const doneSet = new Set(doneIds);
  const doneCount = plan.items.filter((item) => doneSet.has(item.id)).length;
  const percent =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  return {
    doneCount,
    totalCount,
    percent,
    complete: doneCount === totalCount && totalCount > 0,
  };
}

/**
 * Return a single plan item by its stable id, or undefined if not present.
 */
export function getPlanItem(
  plan: ExpatPlan,
  id: string,
): PlanItem | undefined {
  return plan.items.find((item) => item.id === id);
}

/**
 * Produce the localStorage / DB storage key for a country's plan progress.
 * Format: "expat_plan_progress_uk", "expat_plan_progress_us", etc.
 * The key is stable — do not change without a migration.
 */
export function planProgressKey(code: IntentCountryCode): string {
  return `expat_plan_progress_${code}`;
}

/**
 * Parse persisted progress JSON, returning an empty progress object on any
 * parse failure. Safe to call with untrusted input (localStorage values, etc.).
 */
export function parseProgress(raw: string | null | undefined): ExpatPlanProgress {
  if (!raw) return { doneIds: [], updatedAt: new Date(0).toISOString() };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { doneIds?: unknown }).doneIds)
    ) {
      return { doneIds: [], updatedAt: new Date(0).toISOString() };
    }
    const p = parsed as { doneIds: unknown[]; updatedAt?: unknown };
    const doneIds = p.doneIds
      .filter((id): id is string => typeof id === "string")
      .filter((id) => id.length > 0 && id.length < 64);
    const updatedAt =
      typeof p.updatedAt === "string" ? p.updatedAt : new Date(0).toISOString();
    return { doneIds, updatedAt };
  } catch {
    return { doneIds: [], updatedAt: new Date(0).toISOString() };
  }
}

/**
 * Toggle a done state for one item, returning new progress.
 * Pure — does not write anywhere.
 */
export function toggleItemDone(
  progress: ExpatPlanProgress,
  itemId: string,
  done: boolean,
): ExpatPlanProgress {
  const current = new Set(progress.doneIds);
  if (done) {
    current.add(itemId);
  } else {
    current.delete(itemId);
  }
  return {
    doneIds: Array.from(current),
    updatedAt: new Date().toISOString(),
  };
}
