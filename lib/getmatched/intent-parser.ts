/**
 * lib/getmatched/intent-parser.ts
 *
 * Showcase G8 — pure, dependency-free free-text intent parser.
 *
 * `parseFreeTextIntent(text)` maps a short natural-language description of
 * what the user is trying to do ("I want to buy bitcoin", "looking to
 * refinance my mortgage") onto one of the 13 retail `IntentSlug` goals the
 * quiz's step-2 chips offer. It is a heuristic keyword / phrase matcher —
 * NOT an LLM — so it runs entirely client-side with zero cost and zero
 * network, and serves as the always-available fallback when the optional
 * flag-gated AI intake (`./ai-engine.ts`) is unavailable (no API key set).
 *
 * Compliance: this only *routes* the user to the closest goal chip. It never
 * gives advice, never endorses a product, and a low-confidence / ambiguous
 * read returns `null` so the UI nudges the user to pick a chip themselves.
 */

import type { IntentSlug } from "./types";

/** The 13 retail goal slugs the step-2 chips expose. The parser only ever
 *  returns one of these (or null) — niche/advisor slugs are out of scope for
 *  free-text intake. */
export type RetailIntent = Extract<
  IntentSlug,
  | "grow"
  | "income"
  | "crypto"
  | "trade"
  | "automate"
  | "super"
  | "property"
  | "home"
  | "alt_assets"
  | "royalties"
  | "pre_ipo"
  | "help"
  | "browse"
>;

export interface ParsedIntent {
  /** Closest retail goal, or null when nothing matched confidently. */
  intent: RetailIntent | null;
  /** "high" when a single goal clearly wins; "low" when the signal is weak
   *  or contested (caller should ask the user to confirm a chip). */
  confidence: "high" | "low";
  /** The keyword/phrase fragments that drove the match (for analytics + a
   *  "we read: …" UI affordance). Lowercased, de-duplicated. */
  matched_terms: string[];
}

/**
 * Ordered keyword tables. Each entry is a lowercase substring tested against
 * the normalised input. Order within a goal does not matter; cross-goal
 * priority is resolved by score (number of distinct hits), then by the
 * PRIORITY ranking below for ties.
 *
 * Word-boundary-sensitive terms (short tokens that would false-match inside
 * other words, e.g. "art" inside "start", "eth" inside "method") are listed
 * in `BOUNDARY_TERMS` and matched with `\b` anchors instead of substrings.
 */
const KEYWORDS: Record<RetailIntent, string[]> = {
  crypto: [
    "crypto",
    "bitcoin",
    "btc",
    "ethereum",
    "altcoin",
    "blockchain",
    "defi",
    "stablecoin",
    "digital currency",
    "digital asset",
    "coinbase",
    "web3",
    "nft",
  ],
  home: [
    "buy a house",
    "buy a home",
    "first home",
    "first-home",
    "mortgage",
    "refinance",
    "home loan",
    "house deposit",
    "owner occupier",
    "owner-occupier",
    "deposit for a home",
    "deposit for a house",
    "buy property to live",
    "place to live",
  ],
  super: [
    "super",
    "superannuation",
    "smsf",
    "self managed super",
    "self-managed super",
    "retirement fund",
    "salary sacrifice",
    "concessional",
    "preservation age",
  ],
  income: [
    "income",
    "dividend",
    "dividends",
    "passive income",
    "cash flow",
    "cashflow",
    "yield",
    "regular payout",
    "franking",
    "distributions",
  ],
  property: [
    "investment property",
    "rental property",
    "buy to rent",
    "negative gearing",
    "reit",
    "real estate investment",
    "property portfolio",
    "second property",
    "investment unit",
  ],
  trade: [
    "day trade",
    "day trading",
    "active trading",
    "options trading",
    "cfd",
    "leverage",
    "forex",
    "fx trading",
    "technical analysis",
    "short selling",
    "scalping",
    "swing trade",
  ],
  automate: [
    "robo",
    "robo-advisor",
    "robo advisor",
    "set and forget",
    "set-and-forget",
    "automated investing",
    "automatic investing",
    "auto invest",
    "hands off",
    "hands-off",
    "do it for me",
    "managed portfolio",
    "round up",
    "round-up",
  ],
  alt_assets: [
    "whisky",
    "whiskey",
    "wine",
    "watch",
    "watches",
    "collectible",
    "collectibles",
    "alternative asset",
    "alternative investment",
    "fine art",
    "luxury asset",
    "memorabilia",
    "trading card",
  ],
  royalties: [
    "royalty",
    "royalties",
    "music rights",
    "music royalties",
    "song catalogue",
    "song catalog",
    "licensing income",
    "publishing rights",
    "ip income",
  ],
  pre_ipo: [
    "pre-ipo",
    "pre ipo",
    "private equity",
    "startup equity",
    "start-up equity",
    "venture",
    "vc deal",
    "angel invest",
    "private company shares",
    "unlisted shares",
  ],
  grow: [
    "grow my money",
    "grow my wealth",
    "long term",
    "long-term",
    "build wealth",
    "wealth building",
    "etf",
    "index fund",
    "shares",
    "stock market",
    "invest for the future",
    "nest egg",
  ],
  help: [
    "financial adviser",
    "financial advisor",
    "financial planner",
    "speak to someone",
    "talk to an expert",
    "talk to a professional",
    "need advice",
    "get advice",
    "tax agent",
    "accountant",
    "not sure what to do",
    "don't know where to start",
    "dont know where to start",
    "help me decide",
  ],
  browse: [
    "just looking",
    "just browsing",
    "exploring options",
    "see what's out there",
    "see whats out there",
    "have a look",
    "window shopping",
  ],
};

/** Short tokens that must match on word boundaries to avoid false positives
 *  (e.g. "art" in "start", "eth" in "method", "vc" in "service"). */
const BOUNDARY_TERMS: Partial<Record<RetailIntent, string[]>> = {
  crypto: ["eth"],
  alt_assets: ["art"],
};

/**
 * Tie-break priority when two goals score equally. More specific goals win
 * over broad ones so e.g. "smsf property" resolves to super (the SMSF signal)
 * rather than property, and "dividend etf" resolves to income over grow.
 * Lower index = higher priority.
 */
const PRIORITY: RetailIntent[] = [
  "crypto",
  "home",
  "super",
  "royalties",
  "pre_ipo",
  "alt_assets",
  "trade",
  "automate",
  "income",
  "property",
  "grow",
  "help",
  "browse",
];

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'") // curly → straight apostrophes
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse a free-text description into the closest retail goal.
 *
 * Algorithm:
 *  1. Normalise the input.
 *  2. For each goal, count distinct matched terms (substring hits +
 *     boundary-anchored hits).
 *  3. The goal with the most hits wins; ties broken by `PRIORITY`.
 *  4. Confidence is "high" when the winner has ≥1 hit AND is a clear leader
 *     (no runner-up, or the runner-up scored strictly fewer hits); otherwise
 *     "low". An empty / no-hit input returns `{ intent: null }`.
 */
export function parseFreeTextIntent(text: string): ParsedIntent {
  const input = normalise(text ?? "");
  if (input.length === 0) {
    return { intent: null, confidence: "low", matched_terms: [] };
  }

  const hitsByGoal = new Map<RetailIntent, Set<string>>();

  for (const goal of Object.keys(KEYWORDS) as RetailIntent[]) {
    const set = new Set<string>();
    for (const term of KEYWORDS[goal]) {
      if (input.includes(term)) set.add(term);
    }
    for (const term of BOUNDARY_TERMS[goal] ?? []) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`);
      if (re.test(input)) set.add(term);
    }
    if (set.size > 0) hitsByGoal.set(goal, set);
  }

  if (hitsByGoal.size === 0) {
    return { intent: null, confidence: "low", matched_terms: [] };
  }

  // Rank by hit count, then by PRIORITY.
  const ranked = [...hitsByGoal.entries()].sort((a, b) => {
    const byCount = b[1].size - a[1].size;
    if (byCount !== 0) return byCount;
    return PRIORITY.indexOf(a[0]) - PRIORITY.indexOf(b[0]);
  });

  const winnerEntry = ranked[0];
  if (!winnerEntry) {
    return { intent: null, confidence: "low", matched_terms: [] };
  }
  const [winner, winnerHits] = winnerEntry;
  const runnerUp = ranked[1];

  const matched_terms = [...winnerHits].sort();

  // Confidence is high when there is a single clear leader: either no
  // runner-up, or the runner-up scored strictly fewer hits. A tie on hit
  // count (e.g. exactly one keyword each for two goals) is genuinely
  // ambiguous → low confidence, so the UI asks the user to confirm a chip.
  const clearLeader = !runnerUp || runnerUp[1].size < winnerHits.size;
  const confidence: "high" | "low" =
    clearLeader && winnerHits.size >= 1 ? "high" : "low";

  return { intent: winner, confidence, matched_terms };
}
