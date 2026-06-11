/**
 * /find-advisor quiz configuration — questions, options, and the
 * intent/need mapping tables.
 *
 * Extracted from the page component so the option taxonomy is
 * unit-testable (not-sure exclusivity, overseas specialty routing,
 * matchmaker bridging) without rendering the 2,000-line quiz client.
 *
 * The server-side type resolution lives in app/api/submit-lead/route.ts
 * (`resolveAdvisorTypes`) — every context id added here must either be
 * consumed there or be deliberately neutral (e.g. `not_sure`,
 * `timeline_*` lead-quality signals).
 */

import type { Intent } from "./browse-link";
import {
  INTENT_COUNTRY_CODES,
  intentCountryMeta,
  isKnownIntentCountry,
  type IntentCountryCode,
} from "@/lib/intent-context";

export type { Intent };

// ─── Step 1: intent cards ────────────────────────────────────────────────────

export interface IntentOption {
  id: Intent;
  emoji: string;
  title: string;
  desc: string;
  baseClass: string;
  selClass: string;
}

export const INTENT_OPTIONS: IntentOption[] = [
  {
    id: "buy_property",
    emoji: "\u{1F3E0}",
    title: "Buy Property",
    desc: "Find a mortgage broker, buyer's agent, or refinancing help",
    baseClass: "from-rose-50 to-orange-50 border-rose-200 hover:border-rose-400 hover:shadow-rose-100",
    selClass: "from-rose-50 to-orange-50 border-rose-500 ring-2 ring-rose-200",
  },
  {
    id: "grow_wealth",
    emoji: "\u{1F4C8}",
    title: "Grow Wealth",
    desc: "Get a financial planner for investing, super, or retirement",
    baseClass: "from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100",
    selClass: "from-emerald-50 to-teal-50 border-emerald-500 ring-2 ring-emerald-200",
  },
  {
    id: "protect_assets",
    emoji: "\u{1F6E1}️",
    title: "Protect Assets",
    desc: "Life insurance, income protection, wills & estate planning",
    baseClass: "from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    selClass: "from-blue-50 to-indigo-50 border-blue-500 ring-2 ring-blue-200",
  },
  {
    id: "business_tax",
    emoji: "\u{1F4CA}",
    title: "Tax & SMSF",
    desc: "Self-managed super (SMSF), tax advice, or crypto tax help",
    baseClass: "from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400 hover:shadow-violet-100",
    selClass: "from-violet-50 to-purple-50 border-violet-500 ring-2 ring-violet-200",
  },
];

// ─── Step 2: context questions per intent ────────────────────────────────────

export interface ContextOption {
  id: string;
  label: string;
  /** Optional plain-English clarifier rendered under the label. */
  hint?: string;
}

export interface ContextConfig {
  title: string;
  subtitle: string;
  type: "checkbox" | "radio";
  options: ContextOption[];
}

/**
 * The shared "I'm not sure" option id. It is mutually exclusive with
 * every other option in a checkbox group — picking it clears the rest
 * (and vice versa) so a contradictory selection can't be submitted.
 */
export const NOT_SURE_ID = "not_sure";

export const CONTEXT_CONFIG: Record<Intent, ContextConfig> = {
  buy_property: {
    title: "Tell us about your property plans",
    subtitle: "Select all that apply",
    type: "checkbox",
    options: [
      { id: "first_home", label: "I'm buying my first home" },
      { id: "investment", label: "I'm buying an investment property" },
      { id: "commercial", label: "I'm buying commercial property" },
      { id: "refinance", label: "I'm refinancing my current mortgage" },
      { id: "buyers_agent", label: "I need a buyer's agent to find the right property" },
      { id: NOT_SURE_ID, label: "I'm not sure yet — I need general guidance" },
    ],
  },
  grow_wealth: {
    title: "Where are you at financially?",
    subtitle: "Choose the option that best describes you",
    type: "radio",
    options: [
      { id: "getting_started", label: "Just getting started (under $10k saved)" },
      { id: "have_savings", label: "I have savings but no investing plan ($10k–$100k)" },
      { id: "optimize", label: "I have investments and want to optimise ($100k+)" },
      { id: "retirement", label: "I'm approaching retirement and need a strategy" },
      { id: NOT_SURE_ID, label: "I'm not sure — help me work out where to start" },
    ],
  },
  protect_assets: {
    title: "What do you need to protect?",
    subtitle: "Select all that apply",
    type: "checkbox",
    options: [
      { id: "life_insurance", label: "Life insurance (cover for my dependents)" },
      { id: "income_protection", label: "Income protection (if I can't work)" },
      { id: "estate_planning", label: "Estate planning (will, power of attorney)" },
      { id: "aged_care", label: "Aged care planning" },
      { id: "business_succession", label: "Business succession planning" },
      { id: NOT_SURE_ID, label: "I'm not sure — help me work out what I need" },
    ],
  },
  business_tax: {
    title: "What’s your situation?",
    subtitle: "Choose the option that best describes you",
    type: "radio",
    options: [
      { id: "smsf_setup", label: "I want to set up an SMSF", hint: "A self-managed super fund you control yourself" },
      { id: "smsf_manage", label: "I have an SMSF and need help managing it" },
      { id: "tax_optimization", label: "I need tax optimisation advice" },
      { id: "debt_restructure", label: "I have business debt I want to restructure" },
      { id: "crypto_tax", label: "I need crypto tax help" },
      { id: NOT_SURE_ID, label: "I'm not sure — I'd like a professional to look at my situation" },
    ],
  },
};

/**
 * Apply a context toggle with not-sure exclusivity.
 *
 * Radio groups replace the selection outright. In checkbox groups,
 * selecting "not sure" clears everything else, and selecting a concrete
 * option clears "not sure".
 */
export function toggleContextSelection(
  current: string[],
  id: string,
  isRadio: boolean,
): string[] {
  if (isRadio) return [id];
  if (current.includes(id)) return current.filter((c) => c !== id);
  if (id === NOT_SURE_ID) return [NOT_SURE_ID];
  return [...current.filter((c) => c !== NOT_SURE_ID), id];
}

// ─── Step 3: location + budget + timeline ────────────────────────────────────

export const STATES = [
  { value: "", label: "Select your state or territory…", disabled: true },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

export const BUDGETS = [
  { value: "", label: "Select a range (optional)…" },
  { value: "under_100k", label: "Under $100k" },
  { value: "100k_500k", label: "$100k – $500k" },
  { value: "500k_2m", label: "$500k – $2M" },
  { value: "over_2m", label: "$2M+" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

/** Intent-aware label for the budget select — "investable assets" reads
 *  wrong when the user is buying a house. */
export function budgetLabelForIntent(intent: Intent | null): string {
  switch (intent) {
    case "buy_property":
      return "Approximate property budget";
    case "business_tax":
      return "Approximate SMSF or portfolio size";
    default:
      return "Approximate investable assets or portfolio size";
  }
}

export interface TimelineOption {
  id: "asap" | "weeks" | "research";
  label: string;
}

/**
 * Optional urgency signal. Stored as a `timeline_<id>` entry in the
 * lead's context array — ignored by the server's type resolver, but a
 * strong lead-quality signal for advisors and a routing hint for the
 * results screen ("just researching" gets an education path).
 */
export const TIMELINE_OPTIONS: TimelineOption[] = [
  { id: "asap", label: "As soon as possible" },
  { id: "weeks", label: "In the next month or two" },
  { id: "research", label: "Just researching for now" },
];

export function timelineContextId(id: TimelineOption["id"]): string {
  return `timeline_${id}`;
}

// ─── Overseas path (cross-border corridors) ──────────────────────────────────

export interface OverseasCountryOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Country options for "I live outside Australia". The 12 intent-country
 * corridors first (they get corridor-boosted matching via the
 * `iv_intent_country` cookie), then a neutral "Somewhere else".
 */
export const OVERSEAS_COUNTRY_OPTIONS: OverseasCountryOption[] = [
  { value: "", label: "Select where you live…", disabled: true },
  ...INTENT_COUNTRY_CODES.map((code) => {
    const meta = intentCountryMeta(code);
    return { value: code, label: `${meta.flag} ${meta.name.replace(/^the /, "The ")}` };
  }),
  { value: "other", label: "\u{1F30F} Somewhere else" },
];

/**
 * Map an overseas user's intent + country to a cross-border specialty
 * from `CROSS_BORDER_SPECIALTIES` (lib/advisor-specialties.ts). Only
 * returns values that exist in that taxonomy — the API validates the
 * same way, so an unmapped combination simply matches without a
 * specialty preference (corridor boost still applies via the cookie).
 */
export function overseasSpecialtyFor(
  intent: Intent | null,
  country: string,
): string | undefined {
  if (intent === "buy_property") return "FIRB Property (Non-Resident)";
  if (country === "uk") return "UK Pension Transfer";
  if (country === "us") return "FATCA-Aware US Expat Planning";
  return undefined;
}

/** Type guard re-export so the page can validate the select value. */
export function isOverseasCorridor(value: string): value is IntentCountryCode {
  return isKnownIntentCountry(value);
}

/** Display name ("the UK", "Hong Kong") for match-reason copy. */
export function overseasCountryName(country: string): string | null {
  return isKnownIntentCountry(country) ? intentCountryMeta(country).name : null;
}

/** ISO alpha-2 (uppercase) for corridor checks against
 *  `available_in_countries` (which stores lowercase ISO codes). */
export function overseasCountryIso(country: string): string | null {
  return isKnownIntentCountry(country) ? intentCountryMeta(country).iso : null;
}

// ─── Intent/need bridges ─────────────────────────────────────────────────────

export function intentToNeed(intent: Intent): string {
  return { buy_property: "mortgage", grow_wealth: "planning", protect_assets: "insurance", business_tax: "smsf" }[intent] ?? "planning";
}

export const NEED_TO_INTENT: Record<string, Intent> = {
  mortgage: "buy_property",
  buyers: "buy_property",
  insurance: "protect_assets",
  planning: "grow_wealth",
  tax: "business_tax",
  wealth: "grow_wealth",
  smsf: "business_tax",
  estate: "protect_assets",
  agedcare: "protect_assets",
  property: "buy_property",
  crypto: "business_tax",
};

// ─── Matchmaker bridge (/start funnel hand-off) ──────────────────────────────

export const PRIORITY_TO_NEED: Record<string, string> = {
  "mortgage-broker": "mortgage",
  "buyers-agent": "buyers",
  "financial-planner": "planning",
  "smsf-accountant": "smsf",
  "tax-agent": "tax",
  "insurance-broker": "insurance",
  "wealth": "wealth",
};

export const GOAL_TO_NEED: Record<string, string> = {
  home: "mortgage",
  property: "property",
  wealth: "wealth",
  crypto: "crypto",
  super: "smsf",
  income: "planning",
};

// ─── Lenient phone sanity check ──────────────────────────────────────────────

/**
 * Phone is optional; when provided it just needs to look like a real
 * number (AU or international — overseas users have foreign numbers).
 * Catches keyboard mash without rejecting legitimate formats.
 */
export function isPlausiblePhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true; // optional
  if (!/^[+\d][\d\s()\-]*$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}
