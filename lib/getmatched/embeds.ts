/**
 * Contextual embed configuration.
 *
 * One engine, different skins. Each context resolves to a headline, an
 * optional intent pre-fill, and an optional starting step that lets us
 * skip questions we already know the answer to.
 */

import type { EmbedConfig, EmbedContext, IntentSlug } from "./types";

const CONFIGS: Record<EmbedContext, Omit<EmbedConfig, "context">> = {
  homepage: {
    headline: "What are you trying to do?",
    subtitle:
      "Tell us your goal. We'll build your investment action plan and guide you to the right next step.",
  },
  smsf_guide: {
    headline: "Build your SMSF property action plan",
    subtitle:
      "Property through SMSF usually involves more than one professional. We'll map out who you actually need.",
    intent_prefill: "smsf_property",
    start_step: 3,
    prefill_answers: { intent: "smsf_property" },
  },
  opportunity: {
    headline: "Need help assessing this opportunity?",
    subtitle:
      "Tell us a little about the deal and we'll route you to the right help — finance, tax, legal, or a full due-diligence team.",
    intent_prefill: "opportunity_assessment",
    start_step: 3,
    prefill_answers: { intent: "opportunity_assessment" },
  },
  advisor_directory: {
    headline: "Not sure whether you need an individual, firm or team?",
    subtitle:
      "Answer 30 seconds of questions — we'll suggest the right kind of provider for your situation.",
    intent_prefill: "financial_advice",
    start_step: 4,
    prefill_answers: { intent: "financial_advice" },
  },
  platform_compare: {
    headline: "Not sure which platform fits your investing style?",
    subtitle:
      "We'll match you to the comparison shortlist that fits your budget, market and priorities.",
    intent_prefill: "compare_platform",
    start_step: 5,
    prefill_answers: { intent: "compare_platform" },
  },
};

export function getEmbedConfig(context: EmbedContext): EmbedConfig {
  return { context, ...CONFIGS[context] };
}

export function isEmbedContext(value: unknown): value is EmbedContext {
  return (
    typeof value === "string" &&
    Object.keys(CONFIGS).includes(value as EmbedContext)
  );
}

export const HOMEPAGE_GOAL_CHIPS: { value: IntentSlug; label: string; icon: string }[] = [
  { value: "compare_platform", label: "Compare investing platforms", icon: "git-compare" },
  { value: "start_investing", label: "Start investing", icon: "trending-up" },
  { value: "buy_property", label: "Buy investment property", icon: "home" },
  { value: "smsf_property", label: "Invest through my SMSF", icon: "building" },
  { value: "opportunity_assessment", label: "Assess an opportunity", icon: "search" },
  { value: "business_acquisition", label: "Buy a business", icon: "briefcase" },
  { value: "foreign_investor", label: "Invest from overseas", icon: "globe" },
  { value: "financial_advice", label: "Get expert help", icon: "users" },
  { value: "listing_owner", label: "Post / list an opportunity", icon: "tag" },
];
