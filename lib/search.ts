/**
 * lib/search.ts — Unified full-text search across brokers, professionals,
 * articles, glossary, and static tools.
 *
 * Uses PostgreSQL `websearch_to_tsquery` so queries like
 *   "CommSec ETFs" → brokers with CommSec + ETF in their text
 *   "CGT calculator" → articles + tools matching CGT
 *   "Vanguard ETF" → both brokers and articles
 *
 * Each category is capped before returning so the overlay stays snappy;
 * the /search page uses higher caps for exhaustive results.
 *
 * AFSL note: results are factual lookups (names, descriptions, slugs).
 * No ranked recommendations, no "best" ordering by commission — purely
 * alphabetical / ts_rank ordering. Safe under general-advice AFSL.
 */

import { createClient } from "@/lib/supabase/server";
import { FULL_GLOSSARY_ENTRIES } from "@/lib/glossary-extended";
import type { GlossaryEntry } from "@/lib/glossary";

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface BrokerResult {
  slug: string;
  name: string;
  tagline: string | null;
}

export interface AdvisorResult {
  slug: string;
  name: string;
  type: string;
  location_display: string | null;
  firm_name: string | null;
}

export interface ArticleResult {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
}

export interface GlossaryResult {
  slug: string;
  term: string;
  definition: string;
  category: string | undefined;
}

export interface ToolResult {
  slug: string;
  title: string;
  description: string;
  href: string;
}

export interface UnifiedSearchResults {
  brokers: BrokerResult[];
  advisors: AdvisorResult[];
  articles: ArticleResult[];
  glossary: GlossaryResult[];
  tools: ToolResult[];
  /** Milliseconds the search took, for telemetry */
  durationMs: number;
}

// ─── Static tools index ───────────────────────────────────────────────────────

export const TOOLS_INDEX: ToolResult[] = [
  { slug: "brokerage-calculator", title: "Brokerage Calculator", description: "Compare trading costs across platforms", href: "/calculators" },
  { slug: "mortgage-calculator", title: "Mortgage Calculator", description: "Repayment estimates and amortisation", href: "/mortgage-calculator" },
  { slug: "retirement-calculator", title: "Retirement Calculator", description: "Project your retirement savings", href: "/retirement-calculator" },
  { slug: "savings-calculator", title: "Savings Calculator", description: "Interest earnings projector", href: "/savings-calculator" },
  { slug: "smsf-calculator", title: "SMSF Calculator", description: "SMSF fee comparison tool", href: "/smsf-calculator" },
  { slug: "cgt-calculator", title: "CGT Calculator", description: "Capital gains tax estimator", href: "/cgt-calculator" },
  { slug: "firb-fee-estimator", title: "FIRB Fee Estimator", description: "Foreign investment application fee", href: "/firb-fee-estimator" },
  { slug: "non-resident-dividend-calculator", title: "Non-Resident Dividend Calculator", description: "DTA withholding tax on ASX dividends", href: "/non-resident-dividend-calculator" },
  { slug: "non-resident-cgt-checker", title: "Non-Resident CGT Checker", description: "Section 855-10 exemption eligibility", href: "/non-resident-cgt-checker" },
  { slug: "franking-credits-calculator", title: "Franking Credits Calculator", description: "Imputation credits and refund estimate", href: "/franking-credits-calculator" },
  { slug: "fee-simulator", title: "Fee Simulator", description: "Project how fees erode your portfolio", href: "/fee-simulator" },
  { slug: "switching-calculator", title: "Switching Calculator", description: "Cost to switch brokers", href: "/switching-calculator" },
  { slug: "portfolio-xray", title: "Portfolio X-Ray", description: "Analyse your holdings for overlap and risk", href: "/portfolio-xray" },
  { slug: "tax-optimizer", title: "Tax Optimizer", description: "Tax loss harvesting and CGT planning", href: "/tax-optimizer" },
  { slug: "trade-cost-calculator", title: "Trade Cost Calculator", description: "Per-trade cost including brokerage and FX", href: "/trade-cost-calculator" },
  { slug: "us-share-costs-calculator", title: "US Share Costs Calculator", description: "Total cost of buying US stocks from Australia", href: "/us-share-costs-calculator" },
  { slug: "quick-audit", title: "Quick Audit Tool", description: "30-second portfolio health check", href: "/quick-audit" },
  { slug: "chess-lookup", title: "CHESS Lookup", description: "Check CHESS sponsorship of your holding", href: "/chess-lookup" },
  { slug: "rd-tax-calculator", title: "R&D Tax Calculator", description: "R&D incentive offset estimator", href: "/rd-tax-calculator" },
];

// ─── Search helpers ───────────────────────────────────────────────────────────

/**
 * Sanitise a user query for safe use with websearch_to_tsquery.
 * Truncates to 200 chars; strips control characters.
 */
export function sanitiseQuery(raw: string): string {
  return raw.replace(/[\x00-\x1f]/g, "").slice(0, 200).trim();
}

/**
 * Filter the static tools index by a query string.
 * Simple case-insensitive substring match — no DB required.
 */
export function searchTools(query: string, cap = 4): ToolResult[] {
  const q = query.toLowerCase();
  return TOOLS_INDEX.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.slug.includes(q)
  ).slice(0, cap);
}

/**
 * Filter the static glossary entries by a query string.
 * Term matches are weighted higher than definition matches.
 */
export function searchGlossaryStatic(query: string, cap = 5): GlossaryResult[] {
  const q = query.toLowerCase();
  const termHits = FULL_GLOSSARY_ENTRIES.filter((e) =>
    e.term.toLowerCase().includes(q)
  );
  const defHits = FULL_GLOSSARY_ENTRIES.filter(
    (e) =>
      !e.term.toLowerCase().includes(q) &&
      e.definition.toLowerCase().includes(q)
  );
  return [...termHits, ...defHits].slice(0, cap).map((e: GlossaryEntry) => ({
    slug: e.slug,
    term: e.term,
    definition: e.definition,
    category: e.category,
  }));
}

/**
 * Full-text search against the DB (brokers, professionals, articles)
 * plus static sources (glossary, tools).
 *
 * Uses PostgreSQL `websearch_to_tsquery` so multi-word queries and
 * quoted phrases work naturally.
 *
 * Caps per category:
 *   overlay (default): brokers 5 / advisors 5 / articles 5 / glossary 5 / tools 4
 *   /search page: pass higher caps
 */
export async function searchAll(
  rawQuery: string,
  caps: { brokers?: number; advisors?: number; articles?: number; glossary?: number; tools?: number } = {}
): Promise<UnifiedSearchResults> {
  const t0 = Date.now();
  const q = sanitiseQuery(rawQuery);

  const brokerCap = caps.brokers ?? 5;
  const advisorCap = caps.advisors ?? 5;
  const articleCap = caps.articles ?? 5;
  const glossaryCap = caps.glossary ?? 5;
  const toolsCap = caps.tools ?? 4;

  // Static searches run synchronously — no async overhead
  const tools = searchTools(q, toolsCap);
  const glossary = searchGlossaryStatic(q, glossaryCap);

  // DB searches run in parallel
  const supabase = await createClient();

  // Cast to `any` at the textSearch step: `search_vec` is a GENERATED ALWAYS
  // tsvector column added by migration 20260525_search_vectors.sql. It is
  // not yet reflected in the auto-generated database.types.ts, so the strict
  // typed Supabase client would reject the column name. This is the
  // established project pattern (see app/api/v1/webhooks/route.ts).
  const [brokersRes, advisorsRes, articlesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase
      .from("brokers")
      .select("slug, name, tagline")
      .eq("status", "active") as any)
      .textSearch("search_vec", q, { type: "websearch", config: "english" })
      .order("name", { ascending: true })
      .limit(brokerCap) as Promise<{ data: BrokerResult[] | null; error: unknown }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase
      .from("professionals")
      .select("slug, name, type, location_display, firm_name")
      .eq("status", "active") as any)
      .textSearch("search_vec", q, { type: "websearch", config: "english" })
      .order("name", { ascending: true })
      .limit(advisorCap) as Promise<{ data: AdvisorResult[] | null; error: unknown }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase
      .from("articles")
      .select("slug, title, excerpt, category")
      .eq("status", "published") as any)
      .textSearch("search_vec", q, { type: "websearch", config: "english" })
      .order("title", { ascending: true })
      .limit(articleCap) as Promise<{ data: ArticleResult[] | null; error: unknown }>,
  ]);

  return {
    brokers: brokersRes.data ?? [],
    advisors: advisorsRes.data ?? [],
    articles: articlesRes.data ?? [],
    glossary,
    tools,
    durationMs: Date.now() - t0,
  };
}
