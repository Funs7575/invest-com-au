/**
 * Programmatic SEO helpers for /marketplace/[intent]/[state] landing pages.
 *
 * Pure functions for deriving titles, descriptions, and breadcrumb data from
 * an intent + state combo. The DB-touching parts live in the page modules;
 * this file is unit-testable in isolation.
 *
 * `bestPageMeta` takes the intent **slug** and a **provider noun** separately
 * and on purpose:
 *   - the slug ("opportunity_assessment") builds the canonical URL, which MUST
 *     match the route that `generateStaticParams` actually emits;
 *   - the noun ("opportunity assessment specialists") builds the human copy.
 * Deriving the canonical from the (slugified) noun was the bug that pointed
 * every page's canonical at a non-existent, `noindex` URL — see
 * `lib/getmatched/intent-presentation.ts` for where the noun comes from.
 */
import { absoluteUrl, CURRENT_YEAR } from "@/lib/seo";

export interface AustralianState {
  code: string;
  slug: string;
  fullName: string;
}

export const AUSTRALIAN_STATES: AustralianState[] = [
  { code: "NSW", slug: "nsw", fullName: "New South Wales" },
  { code: "VIC", slug: "vic", fullName: "Victoria" },
  { code: "QLD", slug: "qld", fullName: "Queensland" },
  { code: "WA",  slug: "wa",  fullName: "Western Australia" },
  { code: "SA",  slug: "sa",  fullName: "South Australia" },
  { code: "TAS", slug: "tas", fullName: "Tasmania" },
  { code: "ACT", slug: "act", fullName: "Australian Capital Territory" },
  { code: "NT",  slug: "nt",  fullName: "Northern Territory" },
];

export function getStateBySlug(slug: string): AustralianState | null {
  return AUSTRALIAN_STATES.find((s) => s.slug === slug) ?? null;
}

export interface BestPageMeta {
  title: string;
  description: string;
  canonical: string;
  h1: string;
}

export function bestPageMeta(input: {
  /** Intent slug — drives the canonical URL (must match the live route). */
  intentSlug: string;
  /** Plural provider noun — drives the title/H1/description copy. */
  intentNoun: string;
  state?: AustralianState | null;
}): BestPageMeta {
  const { intentSlug, intentNoun, state } = input;
  const where = state ? state.fullName : "Australia";
  const path = state
    ? `/marketplace/${intentSlug}/${state.slug}`
    : `/marketplace/${intentSlug}`;
  // No "| Invest.com.au" suffix here — the root layout's title template
  // (`%s — Invest.com.au`) appends the brand, so adding it again double-brands.
  return {
    title: `Best ${intentNoun} in ${where} (${CURRENT_YEAR})`,
    description: `Compare verified ${intentNoun} in ${where} on Invest.com.au. Browse profiles, get matched, or send an Investor Brief — free to browse, and providers come to you.`,
    canonical: absoluteUrl(path),
    h1: `Best ${intentNoun} in ${where}`,
  };
}

/**
 * Generate the canonical list of (intent_slug × state_slug) combos for
 * `generateStaticParams` on the [intent]/[state] route.
 */
export function generateBestCombos(
  intentSlugs: string[],
): Array<{ intent: string; state: string }> {
  const out: Array<{ intent: string; state: string }> = [];
  for (const intent of intentSlugs) {
    for (const state of AUSTRALIAN_STATES) {
      out.push({ intent, state: state.slug });
    }
  }
  return out;
}

/**
 * Default FAQ block — 3 generic Q&A that work for any intent/state combo.
 * Takes the provider *noun* (not the intent label) so the questions read as
 * grammatical English. Admins can override per-intent via a future content
 * table.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export function defaultFaqs(intentNoun: string, stateName?: string): FaqItem[] {
  const where = stateName ? ` in ${stateName}` : " across Australia";
  return [
    {
      q: `How does Invest.com.au verify ${intentNoun}${where}?`,
      a: "Every provider in our marketplace passes identity verification, licence checks (where applicable), and is regularly re-verified. Verified-outcome scoring (from completed engagements) ranks established providers above newer ones.",
    },
    {
      q: `What does it cost to get matched with ${intentNoun}${where}?`,
      a: "Browsing and getting matched is free. Providers pay credits to accept your Match Request, so you never pay just to make contact. Engagement fees (if any) are set by the provider you choose to work with.",
    },
    {
      q: "Can I get general information here, or is this personal advice?",
      a: "Invest.com.au provides general information only — not personal financial advice. Any provider you engage delivers their services under their own AFSL or professional licence.",
    },
  ];
}
