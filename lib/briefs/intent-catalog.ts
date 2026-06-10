/**
 * Brief Studio intent catalog.
 *
 * A consumer-facing presentation layer over the 14 `brief_template`s. The
 * goal is that *every* user intent the site captures elsewhere (the quiz
 * goals, the get-matched flow, the verticals, the advisor directory) has a
 * warm, human entry point here that resolves to exactly one canonical
 * `brief_template` — so the picker can serve "find a mortgage broker",
 * "FIRB help", "second opinion on my SOA", or "sell my business" without
 * the user ever needing to know the word "template".
 *
 * This is the single source of truth for the intent gallery + search. The
 * brief form maps a chosen intent → `brief_template` + sensible
 * provider/routing defaults; the API contract is unchanged.
 *
 * Search keywords are deliberately broad and overlap the quiz's vocabulary
 * (refinance, negative gearing, FIRB, CGT, BAS, due diligence, pre-IPO…) so
 * typing what you actually want surfaces the right card.
 */

import type { BriefTemplate, ProviderPreference } from "./types";

export type IntentGroup =
  | "advice"
  | "property"
  | "tax"
  | "cross_border"
  | "business"
  | "selling";

export interface IntentGroupDef {
  id: IntentGroup;
  label: string;
  icon: string;
}

export interface IntentDef {
  /** Stable id. Canonical intents share their id with the template. */
  id: string;
  /** The brief_template this intent resolves to on submit. */
  template: BriefTemplate;
  /** Consumer-facing label shown on the card. */
  label: string;
  /** One-line tagline under the label. */
  tagline: string;
  /** Icon name (must exist in components/Icon.tsx). */
  icon: string;
  /** Group used for the filter tabs. */
  group: IntentGroup;
  /** Lowercase search keywords — broad on purpose. */
  keywords: string[];
  /** Rotating example prompts shown as freeform placeholders / nudges. */
  examples: string[];
  /** Whether to surface in the "Popular" quick row. */
  popular?: boolean;
  /** Sensible default provider preference once this intent is picked. */
  providerPreference?: ProviderPreference;
  /** Advisor-type hints passed through for routing context. */
  advisorTypes?: string[];
}

export const INTENT_GROUPS: readonly IntentGroupDef[] = [
  { id: "advice", label: "Advice & planning", icon: "trending-up" },
  { id: "property", label: "Property & lending", icon: "home" },
  { id: "tax", label: "Tax & accounting", icon: "landmark" },
  { id: "cross_border", label: "Cross-border", icon: "globe" },
  { id: "business", label: "Business & deals", icon: "briefcase" },
  { id: "selling", label: "Selling & listing", icon: "tag" },
];

export const INTENT_CATALOG: readonly IntentDef[] = [
  // ── Advice & planning ──────────────────────────────────────────────
  {
    id: "financial_adviser",
    template: "financial_adviser",
    label: "Financial advice & planning",
    tagline: "Build wealth, plan retirement, structure your investments.",
    icon: "trending-up",
    group: "advice",
    popular: true,
    providerPreference: "any",
    advisorTypes: ["financial_planner"],
    keywords: [
      "financial adviser", "financial advisor", "financial planner", "planning",
      "wealth", "grow my wealth", "start investing", "investing", "portfolio",
      "retirement", "retire", "super strategy", "shares", "etf", "managed fund",
      "income", "dividends", "estate planning", "insurance", "smsf advice",
    ],
    examples: [
      "I'm 40, earning $150k, and want a long-term plan to build wealth and retire by 60.",
      "I have $250k to invest and want help building a diversified portfolio.",
      "I want a retirement plan that makes my super and investments work together.",
    ],
  },
  {
    id: "second_opinion",
    template: "second_opinion",
    label: "Second opinion on advice",
    tagline: "Have an independent pro sanity-check advice you've received.",
    icon: "scale",
    group: "advice",
    providerPreference: "any",
    keywords: [
      "second opinion", "independent review", "review my advice", "soa",
      "statement of advice", "sanity check", "is this advice good",
      "review my plan", "fee review", "conflicted advice", "switch adviser",
    ],
    examples: [
      "My adviser recommended switching my super — I'd like an independent review before I sign.",
      "I got a Statement of Advice and want a second opinion on whether it's right for me.",
    ],
  },
  {
    id: "general",
    template: "general",
    label: "Something else / not sure",
    tagline: "Describe your situation and we'll route it to the right pros.",
    icon: "message-circle",
    group: "advice",
    providerPreference: "any",
    keywords: [
      "not sure", "other", "general", "help", "question", "advice", "guidance",
      "where do i start", "don't know", "anything else",
    ],
    examples: [
      "I've come into some money and I'm not sure what kind of professional I need.",
      "I have a complex situation and want to talk it through with the right expert.",
    ],
  },

  // ── Property & lending ─────────────────────────────────────────────
  {
    id: "mortgage",
    template: "mortgage",
    label: "Home loan or refinance",
    tagline: "Buy, refinance or restructure — find a mortgage broker.",
    icon: "home",
    group: "property",
    popular: true,
    providerPreference: "any",
    advisorTypes: ["mortgage_broker"],
    keywords: [
      "mortgage", "home loan", "refinance", "refinancing", "broker",
      "mortgage broker", "first home", "first home buyer", "pre-approval",
      "borrowing capacity", "investment loan", "offset", "fixed rate",
      "variable rate", "lmi", "construction loan", "deposit", "buy a home",
      "buy a house",
    ],
    examples: [
      "First-home buyer in VIC with a 10% deposit — what can I borrow and who can help?",
      "I want to refinance a $600k investment loan to a better rate.",
    ],
  },
  {
    id: "smsf_property",
    template: "smsf_property",
    label: "Buy property with your SMSF",
    tagline: "SMSF property strategy and the team to make it happen.",
    icon: "building",
    group: "property",
    popular: true,
    providerPreference: "expert_team",
    advisorTypes: ["smsf_accountant", "buyers_agent", "mortgage_broker"],
    keywords: [
      "smsf property", "smsf", "self managed super", "buy property in super",
      "limited recourse", "lrba", "property in smsf", "super property",
      "commercial property smsf", "smsf loan", "negative gearing",
    ],
    examples: [
      "I have $200k in super and want to set up an SMSF to buy an investment property in QLD.",
      "My SMSF is established — I need lending and a buyer's agent to purchase a property.",
    ],
  },
  {
    id: "commercial_property",
    template: "commercial_property",
    label: "Commercial property",
    tagline: "Purchase, lease or invest in commercial real estate.",
    icon: "factory",
    group: "property",
    providerPreference: "expert_team",
    keywords: [
      "commercial property", "commercial real estate", "office", "warehouse",
      "retail lease", "industrial", "commercial loan", "commercial finance",
      "lease review", "fit out", "cap rate", "net lease",
    ],
    examples: [
      "I'm buying a $1.2m warehouse for my business and need finance plus a lease review.",
      "Looking at a retail premises as an investment — need help assessing the lease and yield.",
    ],
  },

  // ── Tax & accounting ───────────────────────────────────────────────
  {
    id: "tax",
    template: "tax",
    label: "Tax & accounting",
    tagline: "Tax planning, returns, CGT and structuring.",
    icon: "landmark",
    group: "tax",
    popular: true,
    providerPreference: "any",
    advisorTypes: ["tax_agent", "accountant"],
    keywords: [
      "tax", "accountant", "tax agent", "tax return", "cgt", "capital gains",
      "bas", "gst", "tax planning", "deductions", "negative gearing tax",
      "company tax", "trust", "structuring", "depreciation", "ato",
      "tax debt", "crypto tax",
    ],
    examples: [
      "I sold an investment property this year and need help minimising CGT.",
      "I run a small business and want a proactive accountant for tax planning, not just returns.",
    ],
  },
  {
    id: "smsf_accountant",
    template: "smsf_accountant",
    label: "SMSF setup & administration",
    tagline: "Establish, run or wind up a self-managed super fund.",
    icon: "calculator",
    group: "tax",
    providerPreference: "any",
    advisorTypes: ["smsf_accountant", "accountant"],
    keywords: [
      "smsf", "self managed super fund", "smsf setup", "smsf accountant",
      "smsf administration", "smsf audit", "smsf compliance", "smsf tax",
      "wind up smsf", "establish smsf", "super fund accountant",
    ],
    examples: [
      "I want to set up an SMSF and need an accountant to handle establishment and ongoing admin.",
      "My existing SMSF needs a new accountant for compliance and the annual audit.",
    ],
  },

  // ── Cross-border ───────────────────────────────────────────────────
  {
    id: "foreign_investor",
    template: "foreign_investor",
    label: "Investing into Australia from overseas",
    tagline: "Non-resident? FIRB, tax, structuring and lending.",
    icon: "globe",
    group: "cross_border",
    popular: true,
    providerPreference: "expert_team",
    keywords: [
      "foreign investor", "non-resident", "overseas", "firb",
      "foreign investment review board", "buy property in australia",
      "foreign buyer", "stamp duty surcharge", "tax residency",
      "non resident tax", "offshore", "expatriate investing", "structuring",
    ],
    examples: [
      "I live in Singapore and want to buy a A$1.5m property in Sydney — I need FIRB and tax help.",
      "Non-resident wanting to invest in Australian managed funds — what structure and tax applies?",
    ],
  },
  {
    id: "expat",
    template: "expat",
    label: "Australian expat abroad",
    tagline: "Tax residency, super and investing while overseas.",
    icon: "map",
    group: "cross_border",
    providerPreference: "any",
    keywords: [
      "expat", "australian expat", "living overseas", "moving abroad",
      "tax residency", "super while overseas", "non-resident for tax",
      "repatriation", "returning to australia", "double tax", "dta",
      "foreign income",
    ],
    examples: [
      "I'm an Aussie working in the UK — I need help with tax residency and what to do with my super.",
      "Moving back to Australia next year and want to get my investments and tax in order first.",
    ],
  },

  // ── Business & deals ───────────────────────────────────────────────
  {
    id: "business_acquisition",
    template: "business_acquisition",
    label: "Buying a business",
    tagline: "Due diligence, lending and legal for an acquisition.",
    icon: "briefcase",
    group: "business",
    popular: true,
    providerPreference: "expert_team",
    keywords: [
      "buy a business", "business acquisition", "acquisition", "buy out",
      "due diligence", "business valuation", "business finance",
      "business loan", "franchise", "share purchase", "asset purchase",
      "earnout", "mna", "m&a", "buying a franchise",
    ],
    examples: [
      "I'm buying a $900k business and need due diligence, finance and a lawyer to review the contract.",
      "Considering a franchise — I want a team to assess the numbers before I commit.",
    ],
  },
  {
    id: "opportunity_assessment",
    template: "opportunity_assessment",
    label: "Assess an opportunity or deal",
    tagline: "Get experts to vet a specific listing or investment.",
    icon: "search",
    group: "business",
    providerPreference: "expert_team",
    keywords: [
      "opportunity", "assess a deal", "due diligence", "review a listing",
      "investment opportunity", "is this a good investment", "vet a deal",
      "pre-ipo", "wholesale", "private credit", "syndicate", "second look",
      "feasibility",
    ],
    examples: [
      "I found a pre-IPO opportunity and want an independent specialist to assess it before I invest.",
      "There's a property syndicate I'm considering — can a pro review the numbers and risks?",
    ],
  },

  // ── Selling & listing ──────────────────────────────────────────────
  {
    id: "listing",
    template: "listing",
    label: "List an opportunity for sale",
    tagline: "Find buyers for a business, property or asset.",
    icon: "tag",
    group: "selling",
    providerPreference: "any",
    keywords: [
      "sell my business", "list", "listing", "find buyers", "sell",
      "business broker", "sell a property", "divest", "exit", "sell an asset",
      "marketplace listing", "advertise opportunity",
    ],
    examples: [
      "I want to sell my business and reach qualified buyers, compliantly.",
      "Listing a commercial property for sale — I need it packaged and in front of investors.",
    ],
  },
  {
    id: "listing_readiness",
    template: "listing_readiness",
    label: "Get ready to sell / list",
    tagline: "Legal, financial and copy prep before you go to market.",
    icon: "clipboard-list",
    group: "selling",
    providerPreference: "any",
    keywords: [
      "listing readiness", "get ready to sell", "exit ready", "data room",
      "due diligence pack", "valuation", "information memorandum", "im",
      "pitch deck", "prepare to sell", "vendor due diligence",
    ],
    examples: [
      "I want my business sale-ready: clean financials, a data room and a valuation.",
      "Preparing to list — I need help building an information memorandum and getting a defensible price.",
    ],
  },
];

/** Map of template → its canonical intent (first catalog entry for that template). */
const INTENT_BY_TEMPLATE = new Map<BriefTemplate, IntentDef>();
for (const intent of INTENT_CATALOG) {
  if (!INTENT_BY_TEMPLATE.has(intent.template)) {
    INTENT_BY_TEMPLATE.set(intent.template, intent);
  }
}

const INTENT_BY_ID = new Map<string, IntentDef>(
  INTENT_CATALOG.map((i) => [i.id, i]),
);

export function getIntentById(id: string | null | undefined): IntentDef | undefined {
  if (!id) return undefined;
  return INTENT_BY_ID.get(id);
}

export function intentForTemplate(
  template: BriefTemplate | null | undefined,
): IntentDef | undefined {
  if (!template) return undefined;
  return INTENT_BY_TEMPLATE.get(template);
}

export function popularIntents(): IntentDef[] {
  return INTENT_CATALOG.filter((i) => i.popular);
}

export function intentsForGroup(group: IntentGroup): IntentDef[] {
  return INTENT_CATALOG.filter((i) => i.group === group);
}

/**
 * Rank intents against a free-text query. Returns the full catalog
 * (unranked, original order) for an empty query, or a relevance-ordered
 * subset otherwise. Scoring favours, in order: label prefix, label
 * substring, tagline substring, keyword exact, keyword substring.
 */
export function searchIntents(query: string): IntentDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...INTENT_CATALOG];

  const scored: { intent: IntentDef; score: number }[] = [];
  for (const intent of INTENT_CATALOG) {
    const label = intent.label.toLowerCase();
    const tagline = intent.tagline.toLowerCase();
    let score = 0;

    if (label.startsWith(q)) score = Math.max(score, 100);
    else if (label.includes(q)) score = Math.max(score, 80);
    if (tagline.includes(q)) score = Math.max(score, 50);

    for (const kw of intent.keywords) {
      if (kw === q) score = Math.max(score, 70);
      else if (kw.startsWith(q)) score = Math.max(score, 55);
      else if (kw.includes(q) || q.includes(kw)) score = Math.max(score, 40);
    }

    if (score > 0) scored.push({ intent, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => s.intent);
}
