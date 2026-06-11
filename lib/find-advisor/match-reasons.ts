/**
 * "Why we matched you" — answer-driven match explanations for the
 * /find-advisor preview and confirmation cards.
 *
 * Every bullet must be a verifiable fact about THIS advisor connected
 * to what THIS user told us. Nothing here may imply a suitability
 * judgement ("best for you") — the copy explains the factual routing
 * (specialty ↔ stated need, location ↔ stated location, corridor ↔
 * stated country), which keeps it inside the general-information
 * carve-out. Rating and verification bullets are gated behind the
 * licence-mode flags the caller passes in, mirroring the central
 * `SHOW_ADVISOR_RATINGS` / `SHOW_ADVISOR_VERIFIED_BADGE` gates.
 */

import type { Intent } from "./browse-link";

export interface ReasonQuizInput {
  intent: Intent | null;
  context: string[];
  /** AU state ("NSW") — empty string when the user lives overseas. */
  state: string;
  /** "the UK" style display name when the user lives overseas. */
  overseasCountryName?: string | null;
  /** ISO alpha-2 ("GB") when the user lives overseas — checked against
   *  the advisor's `available_in_countries` (lowercase ISO codes). */
  overseasCountryIso?: string | null;
}

export interface ReasonAdvisor {
  type: string;
  specialties: string[] | null;
  location_display: string | null;
  /** Present in the API match payload; used for the local/remote bullet. */
  location_state?: string | null;
  rating: number;
  review_count: number;
  verified: boolean;
  avg_response_minutes?: number | null;
  available_in_countries?: string[] | null;
}

export interface ReasonFlags {
  /** lib/compliance-config SHOW_ADVISOR_RATINGS */
  showRatings: boolean;
  /** lib/compliance-config SHOW_ADVISOR_VERIFIED_BADGE */
  showVerifiedBadge: boolean;
}

// ─── Context taxonomy → human phrase + specialty keywords ────────────────────

interface ContextMeta {
  /** Reads naturally after "matches your need for …" / "who handles …". */
  phrase: string;
  /** Lowercase substrings matched against advisor specialty strings. */
  keywords: string[];
}

const CONTEXT_META: Record<string, ContextMeta> = {
  first_home: { phrase: "buying your first home", keywords: ["first home", "home loan", "mortgage"] },
  investment: { phrase: "buying an investment property", keywords: ["investment propert", "property invest", "mortgage"] },
  commercial: { phrase: "buying commercial property", keywords: ["commercial"] },
  refinance: { phrase: "refinancing your mortgage", keywords: ["refinanc", "home loan", "mortgage"] },
  buyers_agent: { phrase: "finding the right property", keywords: ["buyer", "property search", "acquisition"] },
  getting_started: { phrase: "getting started with investing", keywords: ["first-time", "beginner", "getting started"] },
  have_savings: { phrase: "building your first investing plan", keywords: ["wealth", "portfolio", "invest"] },
  optimize: { phrase: "optimising an established portfolio", keywords: ["portfolio", "high net worth", "hnw", "wealth"] },
  retirement: { phrase: "planning for retirement", keywords: ["retire", "pension", "superannuation", "super"] },
  life_insurance: { phrase: "life insurance cover", keywords: ["life insurance", "personal insurance", "insurance"] },
  income_protection: { phrase: "income protection", keywords: ["income protection", "insurance"] },
  estate_planning: { phrase: "wills and estate planning", keywords: ["estate", "will", "succession"] },
  aged_care: { phrase: "aged care planning", keywords: ["aged care"] },
  business_succession: { phrase: "business succession planning", keywords: ["succession", "business"] },
  smsf_setup: { phrase: "setting up an SMSF", keywords: ["smsf", "self-managed"] },
  smsf_manage: { phrase: "running your SMSF", keywords: ["smsf", "self-managed"] },
  tax_optimization: { phrase: "tax planning", keywords: ["tax"] },
  debt_restructure: { phrase: "restructuring business debt", keywords: ["debt", "lending", "business finance"] },
  crypto_tax: { phrase: "crypto tax", keywords: ["crypto", "digital asset"] },
  not_sure: { phrase: "working out the right next step", keywords: [] },
};

const INTENT_PHRASE: Record<Intent, string> = {
  buy_property: "property buying and finance",
  grow_wealth: "wealth building and investing",
  protect_assets: "protecting your assets and family",
  business_tax: "tax and SMSF matters",
};

function typeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First context id (in the user's selection order) with phrase copy. */
function primaryContextPhrase(input: ReasonQuizInput): string | null {
  for (const id of input.context) {
    const meta = CONTEXT_META[id];
    if (meta && id !== "not_sure") return meta.phrase;
  }
  if (input.intent) return INTENT_PHRASE[input.intent];
  return null;
}

/**
 * Specialties on the advisor that connect to what the user selected —
 * used both for the lead reason bullet and to visually highlight the
 * matching chips on the card.
 */
export function matchedSpecialties(
  context: string[],
  specialties: string[] | null | undefined,
): string[] {
  if (!specialties || specialties.length === 0) return [];
  const keywords = context.flatMap((id) => CONTEXT_META[id]?.keywords ?? []);
  if (keywords.length === 0) return [];
  return specialties.filter((spec) => {
    const lower = spec.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
}

function servesUserCountry(input: ReasonQuizInput, advisor: ReasonAdvisor): boolean {
  const iso = input.overseasCountryIso?.toLowerCase();
  if (!iso) return false;
  return (advisor.available_in_countries ?? []).some(
    (c) => typeof c === "string" && c.toLowerCase() === iso,
  );
}

/**
 * Build 3–4 priority-ordered, fact-based bullets explaining the match.
 *
 * Priority: stated-need specialty fit → professional-type fit →
 * cross-border corridor → location/remote → rating (gated) →
 * responsiveness → verification (gated) → availability.
 */
export function buildMatchReasons(
  input: ReasonQuizInput,
  advisor: ReasonAdvisor,
  flags: ReasonFlags,
): string[] {
  const bullets: string[] = [];
  const phrase = primaryContextPhrase(input);

  // 1. Specialty ↔ stated need (the strongest, most personal reason).
  const specMatches = matchedSpecialties(input.context, advisor.specialties);
  const firstSpec = specMatches[0];
  if (firstSpec && phrase) {
    bullets.push(`Specialises in ${firstSpec} — matches your need for ${phrase}`);
  } else if (firstSpec) {
    bullets.push(`Specialises in ${firstSpec}`);
  }

  // 2. Professional-type fit, phrased from the user's own answer.
  if (phrase && bullets.length === 0) {
    bullets.push(`A ${typeLabel(advisor.type)} — the right type of professional for ${phrase}`);
  } else if (phrase && !firstSpec) {
    bullets.push(`${typeLabel(advisor.type)} experienced with ${phrase}`);
  }

  // 3. Cross-border corridor — only when the advisor actually serves it.
  if (input.overseasCountryName && servesUserCountry(input, advisor)) {
    bullets.push(`Works with clients based in ${input.overseasCountryName}`);
  }

  // 4. Location: local when states align, honest about remote otherwise.
  if (advisor.location_display) {
    if (input.state && advisor.location_state && advisor.location_state === input.state) {
      bullets.push(`Based in ${advisor.location_display} — local to ${input.state}`);
    } else if (input.state || input.overseasCountryName) {
      bullets.push(`Based in ${advisor.location_display} — works with clients remotely`);
    }
  }

  // 5. Social proof (licence-mode gated).
  if (flags.showRatings && advisor.rating >= 4 && advisor.review_count > 0) {
    bullets.push(
      `Rated ${advisor.rating}/5 across ${advisor.review_count} review${advisor.review_count === 1 ? "" : "s"}`,
    );
  }

  // 6. Responsiveness — a real differentiator for "asap" users.
  const mins = advisor.avg_response_minutes;
  if (mins != null && mins > 0 && mins <= 60) {
    bullets.push("Typically responds in under an hour");
  } else if (mins != null && mins > 60 && mins <= 240) {
    bullets.push("Typically responds within a few hours");
  }

  // 7. Verification (licence-mode gated).
  if (flags.showVerifiedBadge && advisor.verified && bullets.length < 4) {
    bullets.push("Credentials and licence verified by our team");
  }

  // 8. Floor: pad to three with honest process facts (an active listing
  //    is accepting introductions; the routing genuinely used the answers).
  const fallbacks = [
    "Currently accepting new client introductions",
    "Matched from your answers — not an open listing or paid placement",
  ];
  for (const fb of fallbacks) {
    if (bullets.length >= 3) break;
    bullets.push(fb);
  }

  return bullets.slice(0, 4);
}
