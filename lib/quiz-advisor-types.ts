/**
 * lib/quiz-advisor-types.ts
 *
 * Single source of truth for the quiz's advisor-type metadata: maps each quiz
 * need-slug (`AdvisorNeed`, kebab-case) to its DB `professionals.type` value,
 * display label, directory-page href, and the "team" cross-sell copy/icon.
 *
 * Previously this lived as parallel `TYPE_DB_MAP` / `ADVISOR_LABELS` /
 * `ADVISOR_HREFS` / `TEAM_META` objects duplicated across
 * `AdvisorResultsScreen.tsx` and `app/api/advisor-match/route.ts` — the route's
 * copy literally carried a "Mirrors TYPE_DB_MAP in AdvisorResultsScreen"
 * comment. Centralising here stops drift (it bit the stranded types:
 * conveyancer / commercial-property-agent matched no type filter at all).
 *
 * `dbType` is typed against the canonical `AdvisorType` union, so a typo or a
 * type missing from `lib/advisor-types.ts` fails the build.
 */
import type { AdvisorType } from "./advisor-types";
import type { AdvisorNeed } from "./quiz-primary-advisor";

export interface QuizAdvisorTypeMeta {
  /** DB `professionals.type`. "" → no type filter (match broadly, then rank). */
  dbType: AdvisorType | "";
  /** Display label (quiz voice). */
  label: string;
  /** Directory page (the dynamic `/advisors/[type]` route). */
  href: string;
  /** Short "why you'd also want them" line for the results "team". */
  teamReason: string;
  /** Icon name (components/Icon) for the team card. */
  teamIcon: string;
}

export const QUIZ_ADVISOR_TYPES: Record<AdvisorNeed, QuizAdvisorTypeMeta> = {
  "mortgage-broker":   { dbType: "mortgage_broker",   label: "Mortgage Broker",          href: "/advisors/mortgage-brokers",          teamReason: "Finance or refinance the purchase",    teamIcon: "home" },
  "buyers-agent":      { dbType: "buyers_agent",      label: "Buyer's Agent",            href: "/advisors/buyers-agents",             teamReason: "Find and negotiate the right property", teamIcon: "search" },
  "conveyancer":       { dbType: "conveyancer",       label: "Conveyancer",              href: "/advisors/conveyancers",              teamReason: "Handle the legal side of settlement",   teamIcon: "file-text" },
  "financial-planner": { dbType: "financial_planner", label: "Financial Planner",        href: "/advisors/financial-planners",        teamReason: "Coordinate your overall strategy",      teamIcon: "briefcase" },
  "smsf-accountant":   { dbType: "smsf_accountant",   label: "SMSF Accountant",          href: "/advisors/smsf-accountants",          teamReason: "Set up and run your SMSF correctly",    teamIcon: "landmark" },
  "tax-agent":         { dbType: "tax_agent",         label: "Tax Agent",                href: "/advisors/tax-agents",                teamReason: "Optimise tax, CGT and deductions",      teamIcon: "file-text" },
  "insurance-broker":  { dbType: "insurance_broker",  label: "Insurance Broker",         href: "/advisors/insurance-brokers",         teamReason: "Protect your assets and income",        teamIcon: "shield" },
  "estate-planner":    { dbType: "estate_planner",    label: "Estate Planner",           href: "/advisors/estate-planners",           teamReason: "Plan your estate and succession",       teamIcon: "file-text" },
  "commercial-property-agent": { dbType: "commercial_property_agent", label: "Commercial Property Agent", href: "/advisors/commercial-property-agents", teamReason: "Buy or lease commercial property", teamIcon: "building" },
  "not-sure":          { dbType: "",                  label: "Financial Advisor",        href: "/find-advisor",                       teamReason: "Help working out who you need",         teamIcon: "users" },
};

const meta = (need: string): QuizAdvisorTypeMeta | undefined =>
  QUIZ_ADVISOR_TYPES[need as AdvisorNeed];

/** DB `professionals.type` for a need-slug ("" when unknown / "not-sure"). */
export const dbTypeForNeed = (need: string): string => meta(need)?.dbType ?? "";

/** Display label for a need-slug (falls back to a generic advisor label). */
export const labelForNeed = (need: string): string => meta(need)?.label ?? "Financial Advisor";

/** Directory href for a need-slug (falls back to the find-advisor funnel). */
export const hrefForNeed = (need: string): string => meta(need)?.href ?? "/find-advisor";
