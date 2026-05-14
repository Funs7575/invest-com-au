/**
 * Per-category CTA mapping for the public Q&A surface (stream QQ).
 *
 * Every published answer page renders a CTA linking visitors into the
 * relevant comparison page or advisor-match funnel. This module is the
 * single source of truth for that mapping so the answer-page component,
 * the QuestionCaptureForm, and any future embed sites all resolve the
 * same URL for a given category string.
 *
 * Tracking: callers should fire trackEvent("qa_answer_cta_click", …)
 * from the client component rather than here — this module is
 * import-safe in RSC contexts.
 */

export interface QaCta {
  /** Short imperative label shown as the button text */
  label: string;
  /** Destination URL (relative, always) */
  href: string;
}

/** Maps QQ question categories to their primary CTA destination. */
export const QA_CATEGORY_CTAS: Record<string, QaCta> = {
  // Platform-type-based categories (mirrors PlatformType in lib/types.ts)
  share_broker: {
    label: "Compare share brokers",
    href: "/share-trading",
  },
  crypto_exchange: {
    label: "Compare crypto exchanges",
    href: "/crypto",
  },
  robo_advisor: {
    label: "Compare robo-advisors",
    href: "/robo-advisors",
  },
  research_tool: {
    label: "Compare research tools",
    href: "/research-tools",
  },
  super_fund: {
    label: "Compare super funds",
    href: "/super",
  },
  property_platform: {
    label: "Compare property investment platforms",
    href: "/property-platforms",
  },
  cfd_forex: {
    label: "Compare CFD & forex brokers",
    href: "/cfd",
  },
  savings_account: {
    label: "Compare savings accounts",
    href: "/savings",
  },
  term_deposit: {
    label: "Compare term deposits",
    href: "/term-deposits",
  },
  fx_provider: {
    label: "Compare money transfer services",
    href: "/compare/money-transfer",
  },

  // Composite / topic categories from the QQ capture form
  managed_funds: {
    label: "Compare ETFs & managed funds",
    href: "/compare/etfs",
  },
  property: {
    label: "Compare property investment platforms",
    href: "/property-platforms",
  },

  // Cross-border specialties — route to advisor match with pre-filled specialty
  "cross_border:uk": {
    label: "Find a UK pension transfer specialist",
    href: "/find-advisor?specialty=UK+Pension+Transfer",
  },
  "cross_border:us": {
    label: "Find a FATCA-aware US expat advisor",
    href: "/find-advisor?specialty=FATCA-Aware+US+Expat+Planning",
  },
  "cross_border:firb": {
    label: "Find a FIRB property specialist",
    href: "/find-advisor?specialty=FIRB+Property+%28Non-Resident%29",
  },
  "cross_border:nz": {
    label: "Find a trans-Tasman financial advisor",
    href: "/find-advisor?specialty=New+Zealand+Expat+Planning",
  },

  // General / advisor-first categories
  advisor: {
    label: "Find a licensed financial advisor",
    href: "/find-advisor",
  },
  general: {
    label: "Find a licensed financial advisor",
    href: "/find-advisor",
  },
};

const DEFAULT_CTA: QaCta = {
  label: "Find a licensed financial advisor",
  href: "/find-advisor",
};

/**
 * Returns the primary CTA for a given QQ question category.
 * Falls back to /find-advisor for unmapped or empty categories.
 */
export function ctaForCategory(category: string | undefined | null): QaCta {
  if (!category) return DEFAULT_CTA;
  return QA_CATEGORY_CTAS[category] ?? DEFAULT_CTA;
}
