/**
 * "Why we matched you" reason builder for the find-advisor quiz.
 *
 * Pure, dependency-free, and unit-tested. Given a matched advisor's real
 * attributes and the user's quiz answers, returns up to `max` short, specific
 * bullets explaining the match — data-driven first (own specialty, cross-border
 * corridor, language, local-to-you, rating, experience, budget), with a small
 * generic-but-true fallback pool so the panel is never empty.
 *
 * Lives in lib/ (not inline in the component) so the logic is testable and
 * reusable across the matched-advisor card and any future surface that needs a
 * match rationale. The DIY-platform equivalent stays inline in app/quiz/page.tsx
 * (`getMatchReasons`) for now; this is the advisor-side counterpart.
 */

export interface AdvisorMatchAttrs {
  /** DB `type`, underscore form e.g. "mortgage_broker". */
  type: string;
  specialties?: string[] | null;
  location_display?: string | null;
  location_state?: string | null;
  rating?: number | null;
  review_count?: number | null;
  verified?: boolean | null;
  accepts_international_clients?: boolean | null;
  international_tax_specialist?: boolean | null;
  firb_specialist?: boolean | null;
  languages?: string[] | null;
  available_in_countries?: string[] | null;
  years_experience?: number | null;
}

export interface AdvisorMatchContext {
  /** Quiz advisor_type slug, hyphenated e.g. "mortgage-broker". */
  advisorType?: string;
  goal?: string;
  amount?: string;
  /** AdvisorLocationStep budget value, e.g. "100k_500k". */
  budget?: string;
  /** User's AU state, e.g. "NSW". */
  userState?: string;
  isInternational?: boolean;
  /** Quiz investor_country key, e.g. "uk". */
  investorCountry?: string;
  visaStatus?: string;
  investorGoalIntl?: string;
}

const COUNTRY_LABELS: Record<string, string> = {
  singapore: "Singapore", hong_kong: "Hong Kong", china: "China", india: "India",
  uae: "the UAE", uk: "the UK", usa: "the US", malaysia: "Malaysia",
  new_zealand: "New Zealand", japan: "Japan", south_korea: "South Korea",
  saudi_arabia: "Saudi Arabia", other: "your country",
};

/** Country → languages where an advisor speaking them is a strong match signal. */
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  china: ["Mandarin", "Cantonese"],
  hong_kong: ["Cantonese", "Mandarin"],
  india: ["Hindi", "Punjabi", "Gujarati", "Tamil", "Telugu"],
  malaysia: ["Malay", "Mandarin"],
  japan: ["Japanese"],
  south_korea: ["Korean"],
  uae: ["Arabic"],
  saudi_arabia: ["Arabic"],
};

const BUDGET_LABELS: Record<string, string> = {
  under_100k: "portfolios under $100k",
  "100k_500k": "$100k–$500k portfolios",
  "500k_2m": "$500k–$2m portfolios",
  over_2m: "$2m+ portfolios",
};

/** Keyword sets per quiz advisor_type — used to surface a *matching*
 *  specialty from the advisor's own free-text specialties list. Exported so
 *  the advisor scorer (lib/quiz-advisor-scoring.ts) reuses the same source. */
export const TYPE_KEYWORDS: Record<string, string[]> = {
  "mortgage-broker": ["mortgage", "home loan", "lending", "refinanc", "finance broker"],
  "buyers-agent": ["buyer", "acquisition", "property"],
  "financial-planner": ["financial plan", "wealth", "retirement", "investment strategy", "advice"],
  "smsf-accountant": ["smsf", "self-managed", "self managed", "super"],
  "tax-agent": ["tax", "cgt", "accountant", "bas", "deduction"],
  "insurance-broker": ["insurance", "life cover", "income protection", "tpd"],
  "estate-planner": ["estate", "will", "succession", "trust"],
};

export const INTL_KEYWORDS = [
  "international", "firb", "non-resident", "non resident", "expat",
  "cross-border", "cross border", "foreign", "overseas", "migration",
];

function typeLabel(type: string): string {
  return type.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function pushUnique(list: string[], reason: string | null | undefined): void {
  if (!reason) return;
  const norm = reason.toLowerCase();
  if (!list.some((r) => r.toLowerCase() === norm)) list.push(reason);
}

/**
 * Build up to `max` "why we matched you" bullets for a matched advisor.
 * Ordered strongest-signal-first; deduped; never empty.
 */
export function buildAdvisorMatchReasons(
  advisor: AdvisorMatchAttrs,
  ctx: AdvisorMatchContext = {},
  max = 3,
): string[] {
  const reasons: string[] = [];
  const specialties = (advisor.specialties ?? []).filter(Boolean);
  const country = ctx.investorCountry;
  const countryLabel = country ? COUNTRY_LABELS[country] ?? "your country" : null;

  // 1) Specialty match — surface the advisor's OWN specialty that fits the need.
  const typeKeywords = ctx.advisorType ? TYPE_KEYWORDS[ctx.advisorType] ?? [] : [];
  const keywordPool = ctx.isInternational ? [...typeKeywords, ...INTL_KEYWORDS] : typeKeywords;
  const matchingSpecialty = specialties.find((s) =>
    keywordPool.some((k) => s.toLowerCase().includes(k)),
  );
  if (matchingSpecialty) pushUnique(reasons, `Specialises in ${matchingSpecialty}`);

  // 2) Cross-border corridor / language (international) OR local-to-you (domestic).
  if (ctx.isInternational) {
    if (country && (advisor.available_in_countries ?? []).includes(country)) {
      pushUnique(reasons, `Works with investors from ${countryLabel}`);
    } else if (advisor.firb_specialist && (ctx.investorGoalIntl === "property" || !ctx.investorGoalIntl)) {
      pushUnique(reasons, "Experienced with FIRB & non-resident property rules");
    } else if (advisor.international_tax_specialist) {
      pushUnique(reasons, "Handles cross-border & non-resident tax");
    } else if (advisor.accepts_international_clients) {
      pushUnique(reasons, "Works with overseas & expat investors");
    }
    if (country) {
      const wanted = COUNTRY_LANGUAGES[country] ?? [];
      const spoken = (advisor.languages ?? []).find((l) =>
        wanted.some((w) => l.toLowerCase() === w.toLowerCase()),
      );
      if (spoken) pushUnique(reasons, `Speaks ${spoken}`);
    }
    if (ctx.visaStatus === "au_expat") pushUnique(reasons, "Works with Australian expats abroad");
  } else if (ctx.userState && advisor.location_state && advisor.location_state === ctx.userState) {
    pushUnique(reasons, `Based in ${advisor.location_display || ctx.userState} — local to you`);
  }

  // 3) Trust / rating.
  if (typeof advisor.rating === "number" && advisor.rating >= 4.5 && (advisor.review_count ?? 0) >= 3) {
    pushUnique(reasons, `Rated ${advisor.rating.toFixed(1)}/5 from ${advisor.review_count} client reviews`);
  } else if (typeof advisor.rating === "number" && advisor.rating >= 4 && (advisor.review_count ?? 0) > 0) {
    pushUnique(reasons, `Well rated — ${advisor.rating.toFixed(1)}/5 from clients`);
  }

  // 4) Experience.
  if (typeof advisor.years_experience === "number" && advisor.years_experience >= 5) {
    pushUnique(reasons, `${advisor.years_experience}+ years' experience`);
  }

  // 5) Budget fit.
  const budgetLabel = ctx.budget ? BUDGET_LABELS[ctx.budget] : undefined;
  if (budgetLabel) pushUnique(reasons, `Works with ${budgetLabel}`);

  // 6) Generic-but-true fallbacks (only to reach `max`).
  if (reasons.length < max) {
    const fallbacks = [
      ctx.advisorType ? `Matched to your ${typeLabel(ctx.advisorType).toLowerCase()} needs` : null,
      advisor.verified ? "ASIC-verified & accepting new clients" : "Accepting new clients",
      "Free, no-obligation intro call",
    ];
    for (const f of fallbacks) {
      if (reasons.length >= max) break;
      pushUnique(reasons, f);
    }
  }

  return reasons.slice(0, max);
}
