/**
 * Programmatic SEO helpers for /marketplace/[intent]/[state] landing pages.
 *
 * Pure functions for deriving titles, descriptions, and breadcrumb data
 * from an intent + state combo. The DB-touching parts live in the page
 * modules; this file is unit-testable in isolation.
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
  intentLabel: string;
  state?: AustralianState | null;
}): BestPageMeta {
  const { intentLabel, state } = input;
  if (state) {
    return {
      title: `Best ${intentLabel} in ${state.fullName} (${CURRENT_YEAR}) | Invest.com.au`,
      description: `Compare verified ${intentLabel} providers in ${state.fullName}. Browse profiles, request a Match, or send an Investor Brief.`,
      canonical: absoluteUrl(`/marketplace/${slugify(intentLabel)}/${state.slug}`),
      h1: `Best ${intentLabel} in ${state.fullName}`,
    };
  }
  return {
    title: `Best ${intentLabel} in Australia (${CURRENT_YEAR}) | Invest.com.au`,
    description: `Compare verified ${intentLabel} providers across Australia. Browse profiles, request a Match, or send an Investor Brief.`,
    canonical: absoluteUrl(`/marketplace/${slugify(intentLabel)}`),
    h1: `Best ${intentLabel} in Australia`,
  };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
 * Admins can override per-intent via a future content table.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export function defaultFaqs(intentLabel: string, stateName?: string): FaqItem[] {
  const where = stateName ? ` in ${stateName}` : " across Australia";
  return [
    {
      q: `How does Invest.com.au find verified ${intentLabel} providers${where}?`,
      a: "Every provider in our marketplace passes identity verification, licence checks (where applicable), and is regularly re-verified. Verified-outcome scoring (from completed engagements) ranks higher providers above newer ones.",
    },
    {
      q: `What does it cost to get matched with a ${intentLabel} provider?`,
      a: "Browsing and getting matched is free. Providers pay credits to accept your Match Request, so you never pay just to make contact. Engagement fees (if any) are set by the provider you choose to work with.",
    },
    {
      q: "Can I get general information here, or is this personal advice?",
      a: "Invest.com.au provides general information only — not personal financial advice. Any provider you engage delivers their services under their own AFSL or professional licence.",
    },
  ];
}
